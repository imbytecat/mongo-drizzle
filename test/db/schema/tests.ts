import { sql } from 'drizzle-orm'
import { numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const tests = pgTable('tests', {
  id: uuid('id').primaryKey().default(sql`uuidv7()`),
  text: text(),
  numeric: numeric(),
  timestamp: timestamp({ precision: 6, withTimezone: true }),
})
