import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from './schema';

export * as schema from './schema';

import { env } from '../env';

const client = new SQL(env.DATABASE_URL);
export const db = drizzle({ client, schema });
