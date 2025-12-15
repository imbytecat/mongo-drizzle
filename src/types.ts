import type { Column } from 'drizzle-orm'
import type { z } from 'zod'

/**
 * 比较操作符类型
 */
export type ComparisonOperator =
  | 'eq'
  | 'gt'
  | 'gte'
  | 'in'
  | 'lt'
  | 'lte'
  | 'ne'
  | 'nin'

/**
 * 逻辑操作符类型
 */
export type LogicalOperator = 'and' | 'or' | 'not' | 'nor'

/**
 * 查询上下文
 */
export interface QueryContext {
  readonly columns: Readonly<Record<string, Column>>
  readonly schemaShape: Readonly<Record<string, z.ZodType>>
}

/**
 * 表元数据
 */
export interface TableMetadata {
  readonly columns: Record<string, Column>
  readonly schemaShape: Record<string, z.ZodType>
}
