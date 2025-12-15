import { createInsertSchema } from 'drizzle-zod'
import type { z } from 'zod'
import { schema } from './db'

const testsInsertSchema = createInsertSchema(schema.tests)
type TestsInsert = z.infer<typeof testsInsertSchema>

export const data = [
  {
    text: 'test 1',
    numeric: '5',
    timestamp: new Date('2024-01-01T00:00:00.000Z'),
  },
  {
    text: 'test 2',
    numeric: '15',
    timestamp: new Date('2024-06-01T00:00:00.000Z'),
  },
  {
    text: 'test 3',
    numeric: '25',
    timestamp: new Date('2025-06-01T00:00:00.000Z'),
  },
] satisfies TestsInsert[]
