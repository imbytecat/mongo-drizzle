import type { z } from 'zod'
import { parseValidDateString } from './date'

/**
 * 类型守卫:检查对象是否有 _zod 属性(是 Zod schema)
 */
export const hasZodProperty = (
  value: unknown,
): value is { _zod: { def: unknown } } => {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_zod' in value &&
    typeof (value as { _zod?: unknown })._zod === 'object' &&
    (value as { _zod?: unknown })._zod !== null
  )
}

/**
 * 类型守卫:检查对象是否是 Zod schema
 */
export const isZodSchema = (value: unknown): value is z.ZodTypeAny => {
  return hasZodProperty(value)
}

/**
 * 获取包装类型的内部 schema
 */
export const getInnerSchema = (def: {
  type: string
  schema?: unknown
  innerType?: unknown
}): unknown => {
  if (def.type === 'transform') return def.schema
  if (def.type === 'optional' || def.type === 'nullable') return def.innerType
  return null
}

/**
 * 检查 Zod schema 是否是日期类型
 * 支持 ZodDate 和包装类型(optional, nullable, transform)
 */
export const isDateSchema = (schema: z.ZodTypeAny): boolean => {
  const def = schema._zod?.def
  if (!def) return false

  // 直接是日期类型
  if (def.type === 'date') return true

  // 递归检查包装类型
  const innerSchema = getInnerSchema(def)
  return Boolean(
    innerSchema && isZodSchema(innerSchema) && isDateSchema(innerSchema),
  )
}

/**
 * 预处理值：将日期字符串转换为 Date 对象
 * 这是为了解决 JSON 传输时无法直接传递 Date 对象的问题
 * 只有当目标 schema 是日期类型时才会进行转换
 */
export const preprocessValue = (
  value: unknown,
  schema: z.ZodTypeAny,
): unknown => {
  // 只有当 schema 是日期类型且值是字符串时才尝试转换
  if (isDateSchema(schema) && typeof value === 'string') {
    const date = parseValidDateString(value)
    return date ?? value
  }
  return value
}

/**
 * 使用 Zod schema 解析和验证值
 * 在验证前会自动将日期字符串转换为 Date 对象
 *
 * @returns 验证成功返回转换后的值，失败返回 undefined
 */
export const parseAndValidateValue = (
  value: unknown,
  schema: z.ZodTypeAny,
): unknown => {
  const processedValue = preprocessValue(value, schema)
  const result = schema.safeParse(processedValue)
  return result.success ? result.data : undefined
}
