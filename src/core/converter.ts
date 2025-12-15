import type { Condition } from '@ucast/core'
import { CompoundCondition, FieldCondition } from '@ucast/core'
import type { SQL } from 'drizzle-orm'
import { COMPARISON_OPERATORS, LOGICAL_OPERATORS } from '../operators'
import type {
  ComparisonOperator,
  LogicalOperator,
  QueryContext,
} from '../types'
import { parseAndValidateValue } from '../utils'

/**
 * 处理字段条件（比较操作）
 * 负责值验证、类型转换和 SQL 生成
 */
const processFieldCondition = (
  condition: FieldCondition,
  context: QueryContext,
): SQL | undefined => {
  const { field, value: rawValue, operator } = condition
  const op = operator as ComparisonOperator

  const column = context.columns[field]
  const fieldSchema = context.schemaShape[field]

  // 提前返回：字段或 schema 不存在
  if (!column || !fieldSchema) {
    return undefined
  }

  const filterFunction = COMPARISON_OPERATORS[op]
  if (!filterFunction) {
    return undefined
  }

  // 数组操作符特殊处理：批量验证
  if (op === 'in' || op === 'nin') {
    if (!Array.isArray(rawValue)) {
      return undefined
    }

    const validValues = rawValue
      .map((v) => parseAndValidateValue(v, fieldSchema))
      .filter((v) => v !== undefined)

    return validValues.length > 0
      ? filterFunction(column, validValues)
      : undefined
  }

  // 单值操作符：直接验证
  const validatedValue = parseAndValidateValue(rawValue, fieldSchema)
  return validatedValue !== undefined
    ? filterFunction(column, validatedValue)
    : undefined
}

/**
 * 处理复合条件（逻辑操作）
 * 递归处理嵌套的 AND/OR/NOT/NOR 条件
 */
const processCompoundCondition = (
  condition: CompoundCondition,
  context: QueryContext,
): SQL | undefined => {
  const op = condition.operator as LogicalOperator
  const logicalFunction = LOGICAL_OPERATORS[op]

  if (!logicalFunction) {
    return undefined
  }

  const childConditions = condition.value.map((cond) =>
    convertConditionToSQL(cond, context),
  )

  return logicalFunction(...childConditions)
}

/**
 * 将 AST 条件节点转换为 Drizzle SQL
 * 这是查询转换的核心入口函数
 */
export const convertConditionToSQL = (
  astNode: Condition,
  context: QueryContext,
): SQL | undefined => {
  if (astNode instanceof CompoundCondition) {
    return processCompoundCondition(astNode, context)
  }

  if (astNode instanceof FieldCondition) {
    return processFieldCondition(astNode, context)
  }

  return undefined
}
