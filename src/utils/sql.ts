import type { Column, SQL } from 'drizzle-orm'

/**
 * 过滤掉 undefined 的 SQL 片段
 * 用于清理可能包含 undefined 的 SQL 数组
 */
export const filterDefinedSQL = (
  sqlArray: readonly (SQL | undefined)[],
): SQL[] => sqlArray.filter((x): x is SQL => x !== undefined)

/**
 * 处理数组类型的过滤操作（in/nin）
 * 统一处理空数组和非数组情况
 */
export const createArrayFilterSQL = (
  column: Column,
  values: unknown,
  sqlFunction: (col: Column, val: unknown[]) => SQL,
): SQL | undefined => {
  if (!Array.isArray(values) || values.length === 0) {
    return undefined
  }
  return sqlFunction(column, values)
}
