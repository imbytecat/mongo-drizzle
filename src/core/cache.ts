import type { Table } from 'drizzle-orm'
import { getTableColumns } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-zod'
import type { TableMetadata } from '../types'

/**
 * 使用 WeakMap 缓存表的元数据（columns + schema）
 * WeakMap 的优势：当 table 对象被垃圾回收时，缓存会自动清理
 */
const tableMetadataCache = new WeakMap<Table, TableMetadata>()

/**
 * 获取或创建表的元数据（columns 和 schema）
 */
export const getTableMetadata = (table: Table): TableMetadata => {
  let metadata = tableMetadataCache.get(table)

  if (!metadata) {
    metadata = {
      columns: getTableColumns(table),
      schemaShape: createSelectSchema(table).shape,
    }
    tableMetadataCache.set(table, metadata)
  }

  return metadata
}
