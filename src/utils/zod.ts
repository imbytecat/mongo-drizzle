import type { z } from 'zod'
import { parseValidDateString } from './date'

/**
 * 类型守卫:检查对象是否是 Zod schema
 */
const isZodSchema = (value: unknown): value is z.ZodTypeAny => {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_zod' in value &&
    typeof (value as { _zod?: unknown })._zod === 'object' &&
    (value as { _zod?: unknown })._zod !== null
  )
}

/**
 * 获取 schema 的内部类型
 *
 * 使用 Zod v4 的官方 API:
 * - `.unwrap()` 方法用于 ZodOptional 和 ZodNullable
 * - `._zod.def.schema` 用于 ZodTransform (内部 API,但文档有记录)
 *
 * @see https://zod.dev - Zod v4 官方文档
 */
const unwrapSchema = (schema: z.ZodTypeAny): z.ZodTypeAny => {
  // 使用 Zod v4 的 .unwrap() 方法 (ZodOptional, ZodNullable, ZodArray 等)
  if ('unwrap' in schema && typeof schema.unwrap === 'function') {
    return schema.unwrap() as z.ZodTypeAny
  }

  // ZodTransform 需要访问内部 schema (文档有记录的内部结构)
  const def = schema._zod?.def
  if (def?.type === 'transform' && 'schema' in def && isZodSchema(def.schema)) {
    return def.schema
  }

  return schema
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

  // 尝试解包并递归检查
  const unwrapped = unwrapSchema(schema)
  if (unwrapped !== schema) {
    return isDateSchema(unwrapped)
  }

  return false
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
