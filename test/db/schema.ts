import { numeric, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const test = pgTable('test', {
  text: text(),
  numeric: numeric(),
  timestamp: timestamp({ precision: 6, withTimezone: true }),
});
