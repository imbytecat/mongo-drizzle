import type { Table } from 'drizzle-orm'
import { getTableColumns } from 'drizzle-orm'
import { createSelectSchema } from 'drizzle-zod'
import type { TableMetadata } from '#/types'

/**
 * 使用 WeakMap 缓存表的元数据
 */
const tableMetadataCache = new WeakMap<Table, TableMetadata>()

/**
 * 获取或创建表的元数据
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
