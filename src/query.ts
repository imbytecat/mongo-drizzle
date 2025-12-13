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
import type { PgSelect } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import type { QueryRequest } from "./schema";

// --- 常量定义 ---

const MONGO_QUERY_PARSER = new MongoQueryParser(allParsingInstructions);

const SORT_DIRECTION = {
	ASC: 1,
	DESC: -1,
} as const;

// --- 类型定义 ---

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
	readonly columns: Readonly<Record<string, Column>>;
	readonly schemaShape: Readonly<Record<string, z.ZodTypeAny>>;
}

interface TableMetadata {
	readonly columns: Record<string, Column>;
	readonly schemaShape: Record<string, z.ZodTypeAny>;
}

// --- 缓存层 ---

/**
 * 使用 WeakMap 缓存表的元数据（columns + schema）
 * WeakMap 的优势：当 table 对象被垃圾回收时，缓存会自动清理
 */
const tableMetadataCache = new WeakMap<Table, TableMetadata>();

/**
 * 获取或创建表的元数据（columns 和 schema）
 */
const getOrCreateTableMetadata = (table: Table): TableMetadata => {
	let metadata = tableMetadataCache.get(table);

	if (!metadata) {
		metadata = {
			columns: getTableColumns(table),
			schemaShape: createSelectSchema(table).shape,
		};
		tableMetadataCache.set(table, metadata);
	}

	return metadata;
};

// --- 辅助函数 ---

/**
 * 过滤掉 undefined 的 SQL 片段
 * 用于清理可能包含 undefined 的 SQL 数组
 */
const filterDefinedSQL = (sqlArray: readonly (SQL | undefined)[]): SQL[] =>
	sqlArray.filter((x): x is SQL => x !== undefined);

/**
 * 使用 Zod schema 解析和验证值
 *
 * @returns 验证成功返回转换后的值，失败返回 undefined
 */
const parseAndValidateValue = (
	value: unknown,
	schema: z.ZodTypeAny,
): unknown => {
	const result = schema.safeParse(value);
	return result.success ? result.data : undefined;
};

/**
 * 处理数组类型的过滤操作（in/nin）
 * 统一处理空数组和非数组情况
 */
const createArrayFilterSQL = (
	column: Column,
	values: unknown,
	sqlFunction: (col: Column, val: unknown[]) => SQL,
): SQL | undefined => {
	if (!Array.isArray(values) || values.length === 0) {
		return undefined;
	}
	return sqlFunction(column, values);
};

// --- 运算符映射 ---

/**
 * 比较运算符到 Drizzle SQL 函数的映射
 * 所有运算符都返回 SQL | undefined 以支持链式处理
 */
const COMPARISON_OPERATORS: Record<
	ComparisonOperator,
	(column: Column, value: unknown) => SQL | undefined
> = {
	eq,
	gt,
	gte,
	lt,
	lte,
	ne,
	in: (col, val) => createArrayFilterSQL(col, val, inArray),
	nin: (col, val) => createArrayFilterSQL(col, val, notInArray),
};

/**
 * 逻辑运算符到 Drizzle SQL 函数的映射
 * 处理 AND、OR、NOT、NOR 等复合条件
 */
const LOGICAL_OPERATORS: Record<
	LogicalOperator,
	(...args: readonly (SQL | undefined)[]) => SQL | undefined
> = {
	and: (...args) => and(...filterDefinedSQL(args)),
	or: (...args) => or(...filterDefinedSQL(args)),
	not: (arg) => (arg ? not(arg) : undefined),
	nor: (...args) => {
		const validConditions = filterDefinedSQL(args);
		const orClause = or(...validConditions);
		return orClause ? not(orClause) : undefined;
	},
};

// --- 核心转换逻辑 ---

/**
 * 处理字段条件（比较操作）
 * 负责值验证、类型转换和 SQL 生成
 */
const processFieldCondition = (
	condition: FieldCondition,
	context: QueryContext,
): SQL | undefined => {
	const { field, value: rawValue, operator } = condition;
	const op = operator as ComparisonOperator;

	const column = context.columns[field];
	const fieldSchema = context.schemaShape[field];

	// 提前返回：字段或 schema 不存在
	if (!column || !fieldSchema) {
		return undefined;
	}

	const filterFunction = COMPARISON_OPERATORS[op];
	if (!filterFunction) {
		return undefined;
	}

	// 数组操作符特殊处理：批量验证
	if (op === "in" || op === "nin") {
		if (!Array.isArray(rawValue)) {
			return undefined;
		}

		const validValues = rawValue
			.map((v) => parseAndValidateValue(v, fieldSchema))
			.filter((v) => v !== undefined);

		return validValues.length > 0
			? filterFunction(column, validValues)
			: undefined;
	}

	// 单值操作符：直接验证
	const validatedValue = parseAndValidateValue(rawValue, fieldSchema);
	return validatedValue !== undefined
		? filterFunction(column, validatedValue)
		: undefined;
};

/**
 * 处理复合条件（逻辑操作）
 * 递归处理嵌套的 AND/OR/NOT/NOR 条件
 */
const processCompoundCondition = (
	condition: CompoundCondition,
	context: QueryContext,
): SQL | undefined => {
	const op = condition.operator as LogicalOperator;
	const logicalFunction = LOGICAL_OPERATORS[op];

	if (!logicalFunction) {
		return undefined;
	}

	const childConditions = condition.value.map((cond) =>
		convertConditionToSQL(cond, context),
	);

	return logicalFunction(...childConditions);
};

/**
 * 将 AST 条件节点转换为 Drizzle SQL
 * 这是查询转换的核心入口函数
 */
const convertConditionToSQL = (
	astNode: Condition,
	context: QueryContext,
): SQL | undefined => {
	if (astNode instanceof CompoundCondition) {
		return processCompoundCondition(astNode, context);
	}

	if (astNode instanceof FieldCondition) {
		return processFieldCondition(astNode, context);
	}

	return undefined;
};

/**
 * 构建排序子句
 * 将 MongoDB 风格的排序对象转换为 Drizzle ORDER BY
 */
const buildOrderByClause = (
	sort: QueryRequest["sort"],
	context: QueryContext,
): SQL[] => {
	if (!sort) {
		return [];
	}

	return filterDefinedSQL(
		Object.entries(sort).map(([field, direction]) => {
			const column = context.columns[field];
			if (!column) {
				return undefined;
			}

			return direction === SORT_DIRECTION.ASC ? asc(column) : desc(column);
		}),
	);
};

// --- 公共 API ---

/**
 * 创建一个可组合的查询修饰器函数
 *
 * 允许你创建可重用的查询片段，类似 Drizzle 文档中的 withFriends 模式
 * 必须在 $dynamic() 模式下使用
 *
 * @example
 * ```typescript
 * // 定义可重用的查询修饰器
 * const withAdults = withMongoQuery(users, {
 *   find: { age: { $gte: 18 } }
 * });
 *
 * const withActiveUsers = withMongoQuery(users, {
 *   find: { status: { $eq: 'active' } }
 * });
 *
 * const withNameSort = withMongoQuery(users, {
 *   sort: { name: 1 }
 * });
 *
 * // 组合使用（必须使用 $dynamic()）
 * let query = db.select().from(users).$dynamic();
 * query = withAdults(query);
 * query = withActiveUsers(query);
 * query = withNameSort(query);
 * const result = await query;
 * ```
 */
export const withMongoQuery = <TTable extends Table>(
	table: TTable,
	request: Partial<QueryRequest>,
) => {
	return <T extends PgSelect>(queryBuilder: T): T => {
		// 获取缓存的表元数据
		const metadata = getOrCreateTableMetadata(table);

		const context: QueryContext = {
			columns: metadata.columns,
			schemaShape: metadata.schemaShape,
		};

		let result = queryBuilder;

		// 应用 where 条件
		if (request.find) {
			const ast = MONGO_QUERY_PARSER.parse(request.find);
			const whereClause = convertConditionToSQL(ast, context);
			if (whereClause) {
				result = result.where(whereClause);
			}
		}

		// 应用排序
		if (request.sort) {
			const orderByClause = buildOrderByClause(request.sort, context);
			if (orderByClause.length > 0) {
				result = result.orderBy(...orderByClause);
			}
		}

		// 应用分页
		if (request.limit !== undefined) {
			result = result.limit(request.limit);
		}

		if (request.skip !== undefined) {
			result = result.offset(request.skip);
		}

		return result;
	};
};
