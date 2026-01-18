import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as schema from '@/db/schema'

export function getTestDatabaseUrl(): string {
	const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
	if (!url) {
		throw new Error('TEST_DATABASE_URL or DATABASE_URL environment variable is required')
	}
	return url
}

export function createTestPool(): pg.Pool {
	return new pg.Pool({
		connectionString: getTestDatabaseUrl(),
		max: 1,
	})
}

export function createTestDb(client: pg.PoolClient) {
	return drizzle({ client, schema })
}

export async function closeTestPool(pool: pg.Pool): Promise<void> {
	await pool.end()
}
