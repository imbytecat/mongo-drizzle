import type { SQL } from 'drizzle-orm'
import { and, not, or } from 'drizzle-orm'
import type { LogicalOperator } from '#/types'
import { filterDefinedSQL } from '#/utils'

/**
 * 逻辑运算符到 Drizzle SQL 函数的映射
 * 处理 AND、OR、NOT、NOR 等复合条件
 */
export const LOGICAL_OPERATORS: Record<
  LogicalOperator,
  (...args: readonly (SQL | undefined)[]) => SQL | undefined
> = {
  and: (...args) => and(...filterDefinedSQL(args)),
  or: (...args) => or(...filterDefinedSQL(args)),
  not: (arg) => (arg ? not(arg) : undefined),
  nor: (...args) => {
    const validConditions = filterDefinedSQL(args)
    const orClause = or(...validConditions)
    return orClause ? not(orClause) : undefined
  },
}
