import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';
import { env } from '#test/env';
import * as schema from './schema';

const client = new SQL(env.DATABASE_URL);
const db = drizzle({ client, schema });

export { schema, db };
