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
import { z } from "zod";
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

// --- 辅助函数 ---

// 帮助函数：过滤掉 undefined 的 SQL 片段
const compactSQL = (args: (SQL | undefined)[]): SQL[] =>
	args.filter((x): x is SQL => x !== undefined);

// 帮助函数：值转换与解析
const castValue = (value: unknown, schema: z.ZodTypeAny): any => {
	// 针对 Date 的特殊处理：JSON 只有字符串，需要转 Date 对象
	if (typeof value === "string" && schema instanceof z.ZodDate) {
		const date = new Date(value);
		if (!Number.isNaN(date.getTime())) {
			return date; // 转换成功直接返回，不需要再过一遍 safeParse，提升一点性能
		}
	}

	// 使用原始 schema 进行校验 (保持这一步是为了利用 Zod 的 coercion 能力，如果有的话)
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
	// 构建上下文
	// 提示：如果在高并发场景下，可以考虑将 schemaShape 缓存到 WeakMap 中，避免每次请求都 createSelectSchema
	const context: QueryContext = {
		columns: getColumns(table),
		schemaShape: createSelectSchema(table).shape,
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
