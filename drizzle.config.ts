import { defineConfig } from 'drizzle-kit'
import { env } from '#test/env'

export default defineConfig({
  dialect: 'postgresql',
  schema: './test/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
})
