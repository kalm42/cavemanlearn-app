import { drizzle } from 'drizzle-orm/node-postgres'

import * as schema from './schema.ts'

// Disabling this here because I don't want to import the type safe env variable here.
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const db = drizzle(process.env.DATABASE_URL!, { schema })
