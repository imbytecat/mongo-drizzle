import { z } from 'zod'

const envSchema = z.object({
  TZ: z.string().optional().default('Asia/Shanghai'),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .optional()
    .default('development'),
  DATABASE_URL: z.url(),
})

const validateEnv = (env: NodeJS.ProcessEnv = process.env) => {
  const result = envSchema.safeParse(env)
  if (!result.success) {
    console.error(
      'Invalid environment variables:',
      z.treeifyError(result.error),
    )
    process.exit(1)
  }
  return result.data
}

export const env = validateEnv()
