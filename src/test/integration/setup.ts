import dotenv from 'dotenv'
import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'

import { closeTestPool, createTestDb, createTestPool } from './test-db'
import type pg from 'pg'

dotenv.config({ path: '.env.local' })

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
