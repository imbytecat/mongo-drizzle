import type { Column, SQL } from 'drizzle-orm'
import { eq, gt, gte, inArray, lt, lte, ne, notInArray } from 'drizzle-orm'
import type { ComparisonOperator } from '#/types'
import { createArrayFilterSQL } from '#/utils'

/**
 * 比较运算符到 Drizzle SQL 函数的映射
 * 所有运算符都返回 SQL | undefined 以支持链式处理
 */
export const COMPARISON_OPERATORS: Record<
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
}
