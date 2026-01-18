import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { PoolClient } from 'pg'

import type * as schema from '@/db/schema'

declare global {
	var testDb: NodePgDatabase<typeof schema>
	var testClient: PoolClient
}

export {}
