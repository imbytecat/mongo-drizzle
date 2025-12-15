import type { SQL, Table } from 'drizzle-orm'
import { asc, desc } from 'drizzle-orm'
import { type PgSelectQueryBuilder, QueryBuilder } from 'drizzle-orm/pg-core'
import { MONGO_QUERY_PARSER, SORT_DIRECTION } from '#/constants'
import type { QueryRequest } from '#/schema'
import type { QueryContext } from '#/types'
import { filterDefinedSQL } from '#/utils'
import { getTableMetadata } from './cache'
import { convertConditionToSQL } from './converter'

/**
 * 构建排序子句
 * 将 MongoDB 风格的排序对象转换为 Drizzle ORDER BY
 */
const buildOrderByClause = (
  sort: QueryRequest['sort'],
  context: QueryContext,
): SQL[] => {
  if (!sort) {
    return []
  }

  return filterDefinedSQL(
    Object.entries(sort).map(([field, direction]) => {
      const column = context.columns[field]
      if (!column) {
        return undefined
      }

      return direction === SORT_DIRECTION.ASC ? asc(column) : desc(column)
    }),
  )
}

/**
 * 应用 MongoDB 查询到 Drizzle 查询构建器
 */
export const withMongoQuery = <TTable extends Table>(
  table: TTable,
  request: QueryRequest,
) => {
  return <T extends PgSelectQueryBuilder>(queryBuilder: T): T => {
    // 获取缓存的表元数据
    const metadata = getTableMetadata(table)

    const context: QueryContext = {
      columns: metadata.columns,
      schemaShape: metadata.schemaShape,
    }

    let result = queryBuilder

    // 应用 where 条件
    if (request.find) {
      const ast = MONGO_QUERY_PARSER.parse(request.find)
      const whereClause = convertConditionToSQL(ast, context)
      if (whereClause) {
        result = result.where(whereClause)
      }
    }

    // 应用排序
    if (request.sort) {
      const orderByClause = buildOrderByClause(request.sort, context)
      if (orderByClause.length > 0) {
        result = result.orderBy(...orderByClause)
      }
    }

    // 应用分页
    if (request.limit !== undefined) {
      result = result.limit(request.limit)
    }

    if (request.skip !== undefined) {
      result = result.offset(request.skip)
    }

    return result
  }
}

/**
 * MongoDB 风格的查询构建器
 */
export const mongoQueryBuilder = <TTable extends Table>(
  table: TTable,
  request: QueryRequest,
) => {
  let qb = new QueryBuilder()
    .select()
    // biome-ignore lint/suspicious/noExplicitAny: 目前无法解决空表推断
    .from(table as any)
    .$dynamic()
  qb = withMongoQuery(table, request)(qb)
  return qb
}
