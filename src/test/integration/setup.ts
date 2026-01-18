import dotenv from 'dotenv'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'

import { closeTestPool, createTestDb, createTestPool } from './test-db'
import type pg from 'pg'

dotenv.config({ path: '.env.local' })

// Mock the db module to use testDb for all integration tests
// This keeps production code clean - it doesn't know about tests
// Using a factory here instead of __mocks__ because:
// 1. Path aliases (@/) may not resolve reliably in __mocks__
// 2. This mock is integration-test-specific (needs globalThis.testDb)
// 3. The getter ensures testDb is accessed at runtime, not module load time
vi.mock('@/db/index.ts', () => {
	return {
		get db() {
			// testDb is set in beforeAll before any tests execute
			return globalThis.testDb
		},
	}
})

let pool: pg.Pool
let client: pg.PoolClient

beforeAll(async () => {
	pool = createTestPool()
	client = await pool.connect()
	globalThis.testDb = createTestDb(client)
	globalThis.testClient = client
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
