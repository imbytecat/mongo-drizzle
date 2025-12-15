import { createInsertSchema } from 'drizzle-zod'
import type { z } from 'zod'
import { schema } from './db'

const testsInsertSchema = createInsertSchema(schema.tests)
type TestsInsert = z.infer<typeof testsInsertSchema>

export const data = [
  // 边界值：最小值
  {
    text: 'minimum',
    numeric: '0',
    timestamp: new Date('2020-01-01T00:00:00.000Z'),
  },
  // 小数值范围
  {
    text: 'small value',
    numeric: '5',
    timestamp: new Date('2021-03-15T08:30:00.000Z'),
  },
  {
    text: 'another small',
    numeric: '8',
    timestamp: new Date('2021-06-20T14:45:00.000Z'),
  },
  // 中等数值范围
  {
    text: 'medium value',
    numeric: '15',
    timestamp: new Date('2022-01-10T10:00:00.000Z'),
  },
  {
    text: 'mid range',
    numeric: '18',
    timestamp: new Date('2022-08-25T16:20:00.000Z'),
  },
  {
    text: 'center point',
    numeric: '20',
    timestamp: new Date('2023-02-14T12:00:00.000Z'),
  },
  // 较大数值范围
  {
    text: 'large value',
    numeric: '25',
    timestamp: new Date('2023-09-01T09:15:00.000Z'),
  },
  {
    text: 'bigger value',
    numeric: '30',
    timestamp: new Date('2024-01-01T00:00:00.000Z'),
  },
  {
    text: 'very large',
    numeric: '50',
    timestamp: new Date('2024-06-15T18:30:00.000Z'),
  },
  // 极大数值
  {
    text: 'huge value',
    numeric: '100',
    timestamp: new Date('2024-12-01T23:59:59.000Z'),
  },
  // 边界值：未来日期
  {
    text: 'future date',
    numeric: '75',
    timestamp: new Date('2025-06-01T00:00:00.000Z'),
  },
  // 边界值：最大值
  {
    text: 'maximum',
    numeric: '999',
    timestamp: new Date('2030-12-31T23:59:59.000Z'),
  },
] satisfies TestsInsert[]
