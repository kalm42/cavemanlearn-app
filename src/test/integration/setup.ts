import dotenv from 'dotenv'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

import { closeTestPool, createTestDb, createTestPool } from './test-db'
import type pg from 'pg'

dotenv.config({ path: '.env.local' })

let pool: pg.Pool
let client: pg.PoolClient

/**
 * ## cleanupTestTables
 *
 * Truncates all test tables to ensure a clean state before running integration tests.
 * This handles cases where previous test runs were interrupted and didn't roll back properly.
 * Tables are truncated in reverse order of foreign key dependencies.
 *
 * @example
 * await cleanupTestTables(client)
 */
async function cleanupTestTables(pgClient: pg.PoolClient): Promise<void> {
	// Delete test users (identified by clerk_id starting with 'user_')
	// This also cascades to organization_members
	await pgClient.query(`DELETE FROM user_profiles WHERE clerk_id LIKE 'user_%'`)
	// Delete test organizations (identified by slug patterns commonly used in tests)
	await pgClient.query(
		`DELETE FROM organizations WHERE slug LIKE 'test-%' OR slug LIKE 'my-%' OR slug LIKE 'org-%' OR slug LIKE 'duplicate-%' OR slug LIKE 'another-%' OR slug LIKE 'gap-%' OR slug LIKE 'similar-%' OR slug LIKE 'owner-%' OR slug LIKE 'name-%' OR slug LIKE 'public-%' OR slug LIKE 'private-%'`,
	)
}

beforeAll(async () => {
	pool = createTestPool()
	client = await pool.connect()
	globalThis.testDb = createTestDb(client)
	globalThis.testClient = client
	// Clean up any leftover test data from previous runs
	await cleanupTestTables(client)
})

beforeEach(async () => {
	await client.query('BEGIN')
})

afterEach(async () => {
	await client.query('ROLLBACK')
})

afterAll(async () => {
	client.release()
	await closeTestPool(pool)
})
