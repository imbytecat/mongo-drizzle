import type { Condition } from "@ucast/core";
import { CompoundCondition, FieldCondition } from "@ucast/core";
import { allParsingInstructions, MongoQueryParser } from "@ucast/mongo";
import type { Column, SQL, Table } from "drizzle-orm";
import {
	and,
	asc,
	desc,
	eq,
	getColumns,
	gt,
	gte,
	inArray,
	lt,
	lte,
	ne,
	not,
	notInArray,
	or,
} from "drizzle-orm";
import type { MySqlSelect } from "drizzle-orm/mysql-core";
import type { PgSelect } from "drizzle-orm/pg-core";
import type { SQLiteSelect } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import type { QueryRequest } from "./schema";

const parser = new MongoQueryParser(allParsingInstructions);

// 支持多种数据库方言的 Select 类型
type AnySelect = PgSelect | MySqlSelect | SQLiteSelect;

type ComparisonOperator =
	| "eq"
	| "gt"
	| "gte"
	| "in"
	| "lt"
	| "lte"
	| "ne"
	| "nin";
type LogicalOperator = "and" | "or" | "not" | "nor";

interface QueryContext {
	columns: Record<string, Column>;
	schemaShape: Record<string, z.ZodTypeAny>;
}

// --- Schema 缓存 ---

// 使用 WeakMap 缓存 schema，避免重复创建，提升性能
const schemaCache = new WeakMap<Table, Record<string, z.ZodTypeAny>>();

// --- 辅助函数 ---

// 帮助函数：过滤掉 undefined 的 SQL 片段
const compactSQL = (args: (SQL | undefined)[]): SQL[] =>
	args.filter((x): x is SQL => x !== undefined);

// 帮助函数：值转换与解析
// Zod v4 的 safeParse 性能大幅提升（14x 字符串，7x 数组，6.5x 对象）
// 直接使用 Zod 的解析和 coercion 能力即可
const castValue = (value: unknown, schema: z.ZodTypeAny): unknown => {
	const result = schema.safeParse(value);
	return result.success ? result.data : undefined;
};

// --- 运算符映射 ---

const comparisonFilterMap: Record<
	ComparisonOperator,
	(col: Column, val: any) => SQL | undefined
> = {
	eq,
	gt,
	gte,
	lt,
	lte,
	ne,
	in: (col, val) =>
		Array.isArray(val) && val.length > 0 ? inArray(col, val) : undefined,
	nin: (col, val) =>
		Array.isArray(val) && val.length > 0 ? notInArray(col, val) : undefined,
};

const logicalFilterMap: Record<
	LogicalOperator,
	(...args: (SQL | undefined)[]) => SQL | undefined
> = {
	and: (...args) => and(...compactSQL(args)),
	or: (...args) => or(...compactSQL(args)),
	not: (arg) => (arg ? not(arg) : undefined),
	nor: (...args) => {
		const valid = compactSQL(args);
		const orClause = or(...valid);

		return orClause ? not(orClause) : undefined;
	},
};

// --- 核心逻辑 ---

const processNode = (
	astNode: Condition,
	context: QueryContext,
): SQL | undefined => {
	// 逻辑条件处理 (AND/OR)
	if (astNode instanceof CompoundCondition) {
		const op = astNode.operator as LogicalOperator;
		if (logicalFilterMap[op]) {
			const conditions = astNode.value.map((cond) =>
				processNode(cond, context),
			);
			return logicalFilterMap[op](...conditions);
		}
		return undefined;
	}

	// 字段条件处理 (Field)
	if (!(astNode instanceof FieldCondition)) {
		return undefined;
	}

	const { field, value: rawValue } = astNode;
	const op = astNode.operator as ComparisonOperator;
	const column = context.columns[field];
	const fieldSchema = context.schemaShape[field];

	// 字段不存在或 Schema 不存在
	if (!column || !fieldSchema) {
		return undefined;
	}

	// 数组操作符处理 (in/nin)
	if (op === "in" || op === "nin") {
		if (!Array.isArray(rawValue)) {
			return undefined;
		}
		const validValues = rawValue
			.map((v) => castValue(v, fieldSchema))
			.filter((v) => v !== undefined);

		const filterFn = comparisonFilterMap[op];
		return filterFn ? filterFn(column, validValues) : undefined;
	}

	// 单值操作符处理
	const finalValue = castValue(rawValue, fieldSchema);
	if (finalValue === undefined) {
		return undefined;
	}

	const filterFn = comparisonFilterMap[op];
	return filterFn ? filterFn(column, finalValue) : undefined;
};

// --- 排序构建 ---

const buildSortSQL = (sort: QueryRequest["sort"], context: QueryContext) => {
	if (!sort) {
		return [];
	}
	return compactSQL(
		Object.entries(sort).map(([field, direction]) => {
			const column = context.columns[field];
			return column
				? direction === 1
					? asc(column)
					: desc(column)
				: undefined;
		}),
	);
};

// --- 对外入口 ---

export const applyMongoQuery = <
	TTable extends Table,
	TQueryBuilder extends AnySelect,
>(
	qb: TQueryBuilder,
	table: TTable,
	request: QueryRequest,
): TQueryBuilder => {
	// 从缓存获取或创建 schema
	let schemaShape = schemaCache.get(table);
	if (!schemaShape) {
		schemaShape = createSelectSchema(table).shape;
		schemaCache.set(table, schemaShape);
	}

	// 构建上下文
	const context: QueryContext = {
		columns: getColumns(table),
		schemaShape,
	};

	const ast = parser.parse(request.find);

	const whereSQL = processNode(ast, context);
	const orderBySQL = buildSortSQL(request.sort, context);

	return qb
		.where(whereSQL)
		.orderBy(...orderBySQL)
		.limit(request.limit)
		.offset(request.skip) as TQueryBuilder;
};
