import type { Condition } from "@ucast/core";
import { CompoundCondition, FieldCondition } from "@ucast/core";
import { allParsingInstructions, MongoQueryParser } from "@ucast/mongo";
import type { Column, SQL, Table } from "drizzle-orm";
import {
	and,
	asc,
	desc,
	eq,
	getTableColumns,
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
import { createSelectSchema } from "drizzle-zod";
import * as z from "zod";

// --- 1. 初始化解析器 ---
const parser = new MongoQueryParser(allParsingInstructions);

// --- 2. 类型定义 ---
export const queryRequestSchema = z
	.object({
		find: z.record(z.string(), z.any()).default({}),
		sort: z
			.record(z.string(), z.union([z.literal(1), z.literal(-1)]))
			.optional(),
		skip: z.number().int().nonnegative().default(0),
		limit: z.number().int().positive().default(50),
	})
	.strict();

export type QueryRequest = z.infer<typeof queryRequestSchema>;

type SupportedMongoComparisonOperator =
	| "eq"
	| "gt"
	| "gte"
	| "in"
	| "lt"
	| "lte"
	| "ne"
	| "nin";
type SupportedMongoLogicalOperator = "and" | "or" | "not" | "nor";

interface QueryContext {
	columns: Record<string, Column>;
	schemaShape: Record<string, z.ZodTypeAny>;
}

// --- 3. 辅助函数 (Utils) ---

// 帮助函数：过滤掉 undefined 的 SQL 片段
const compactSQL = (args: (SQL | undefined)[]): SQL[] =>
	args.filter((x): x is SQL => x !== undefined);

// 帮助函数：拆包 Zod Schema (处理 nullable/optional) 以获取原始类型
const getInnerSchema = (schema: z.ZodTypeAny): z.ZodTypeAny => {
	if (schema instanceof z.ZodNullable || schema instanceof z.ZodOptional) {
		return getInnerSchema(schema.unwrap());
	}
	if (schema instanceof z.ZodEffects) {
		// 处理 refine/transform
		return getInnerSchema(schema._def.schema);
	}
	return schema;
};

// 帮助函数：值转换与解析
const castValue = (value: unknown, schema: z.ZodTypeAny): any => {
	const inner = getInnerSchema(schema);

	// 针对 Date 的特殊处理：JSON 只有字符串，需要转 Date 对象
	if (typeof value === "string" && inner instanceof z.ZodDate) {
		const date = new Date(value);
		if (!Number.isNaN(date.getTime())) {
			return date; // 转换成功直接返回，不需要再过一遍 safeParse，提升一点性能
		}
	}

	// 使用原始 schema 进行校验 (保持这一步是为了利用 Zod 的 coercion 能力，如果有的话)
	const result = schema.safeParse(value);
	return result.success ? result.data : undefined;
};

// --- 4. 运算符映射 ---

const comparisonFilterMap: Record<
	SupportedMongoComparisonOperator,
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
	SupportedMongoLogicalOperator,
	(...args: (SQL | undefined)[]) => SQL | undefined
> = {
	and: (...args) => and(...compactSQL(args)),
	or: (...args) => or(...compactSQL(args)),
	not: (arg) => (arg ? not(arg) : undefined),
	nor: (...args) => {
		const valid = compactSQL(args);
		return valid.length > 0 ? not(or(...valid)!) : undefined;
	},
};

// --- 5. 核心逻辑 ---

const processNode = (
	astNode: Condition,
	context: QueryContext,
): SQL | undefined => {
	// 逻辑条件处理 (AND/OR)
	if (astNode instanceof CompoundCondition) {
		const op = astNode.operator as SupportedMongoLogicalOperator;
		if (logicalFilterMap[op]) {
			const conditions = astNode.value.map((cond) =>
				processNode(cond, context),
			);
			return logicalFilterMap[op](...conditions);
		}
		return undefined;
	}

	// 字段条件处理 (Field)
	if (astNode instanceof FieldCondition) {
		const field = astNode.field;
		if (typeof field !== "string") {
			return undefined;
		}

		const op = astNode.operator as SupportedMongoComparisonOperator;
		const column = context.columns[field];
		const fieldSchema = context.schemaShape[field];

		// 快速失败：字段不存在或 Schema 不存在
		if (!column || !fieldSchema) {
			return undefined;
		}

		const rawValue = astNode.value;
		let finalValue: any;

		// 分离 单值处理 vs 数组处理
		if (op === "in" || op === "nin") {
			if (!Array.isArray(rawValue)) {
				return undefined;
			}
			// 批量转换，过滤无效值
			finalValue = rawValue
				.map((v) => castValue(v, fieldSchema))
				.filter((v) => v !== undefined);
		} else {
			finalValue = castValue(rawValue, fieldSchema);
			if (finalValue === undefined) {
				return undefined;
			}
		}

		const filterFn = comparisonFilterMap[op];
		return filterFn ? filterFn(column, finalValue) : undefined;
	}

	return undefined;
};

// --- 6. 排序构建 ---

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

// --- 7. 对外入口 ---

export const applyMongoQuery = <
	TTable extends Table,
	TQueryBuilder extends {
		where: (sql: SQL | undefined) => TQueryBuilder;
		orderBy: (...columns: SQL[]) => TQueryBuilder;
		limit: (limit: number) => TQueryBuilder;
		offset: (offset: number) => TQueryBuilder;
	},
>(
	qb: TQueryBuilder,
	table: TTable,
	request: QueryRequest,
): TQueryBuilder => {
	// 构建上下文
	// 提示：如果在高并发场景下，可以考虑将 schemaShape 缓存到 WeakMap 中，避免每次请求都 createSelectSchema
	const context: QueryContext = {
		columns: getTableColumns(table),
		schemaShape: createSelectSchema(table).shape,
	};

	const ast = parser.parse(request.find);

	const whereSQL = processNode(ast, context);
	const orderBySQL = buildSortSQL(request.sort, context);

	return qb
		.where(whereSQL)
		.orderBy(...orderBySQL)
		.limit(request.limit)
		.offset(request.skip);
};
