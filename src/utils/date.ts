import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

// 启用 dayjs 的严格解析插件
dayjs.extend(customParseFormat)

/**
 * 检查字符串是否是有效的日期格式并转换为 Date 对象
 */
export const parseValidDateString = (value: string): Date | null => {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.toDate() : null
}
