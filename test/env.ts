import { z } from 'zod'

const envSchema = z.strictObject({
  DATABASE_URL: z.url(),
})

export const env = envSchema.parse(process.env)
