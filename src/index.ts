/**
 * mongo-drizzle - MongoDB风格查询构建器 for Drizzle ORM
 *
 * @packageDocumentation
 */

// 导出常量（如果需要）
export { SORT_DIRECTION } from './constants'
// 导出核心功能
export { applyMongoQuery } from './core'
// 导出类型定义
export type {
  ComparisonOperator,
  LogicalOperator,
  QueryContext,
  TableMetadata,
} from './types'

// 导出工具函数（如果需要被外部使用）
export { isDateSchema, parseValidDateString } from './utils'
