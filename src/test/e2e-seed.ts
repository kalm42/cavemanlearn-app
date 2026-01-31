import { like } from 'drizzle-orm'
import pg from 'pg'

import { createTestDb, getTestDatabaseUrl } from './integration/test-db'
import { organizations, userProfiles } from '@/db/schema'

/**
 * ## seedPublisherUser
 *
 * Ensures the test user exists in the database as a publisher. Creates the user profile
 * if it doesn't exist, or updates the userType to 'publisher' if it does. This is used
 * by e2e tests to guarantee the test user has publisher access before running tests.
 *
 * @example
 * await seedPublisherUser('user_abc123', 'test@example.com')
 */
export async function seedPublisherUser(
	pool: pg.Pool,
	args: { clerkId: string; email: string },
): Promise<void> {
	const { clerkId, email } = args
	const client = await pool.connect()
	try {
		const db = createTestDb(client)
		await db
			.insert(userProfiles)
			.values({ clerkId, email, userType: 'publisher' })
			.onConflictDoUpdate({
				target: userProfiles.clerkId,
				set: { userType: 'publisher' },
			})
	} finally {
		client.release()
	}
}

/**
 * ## cleanupTestOrganizations
 *
 * Removes all organizations created by e2e tests (identified by the "E2E Test" prefix
 * in their names). This ensures a clean slate before each test run and prevents test
 * pollution from previous runs.
 *
 * @example
 * await cleanupTestOrganizations()
 */
export async function cleanupTestOrganizations(pool: pg.Pool): Promise<void> {
	const client = await pool.connect()
	try {
		const db = createTestDb(client)
		await db.delete(organizations).where(like(organizations.name, 'E2E Test%'))
	} finally {
		client.release()
	}
}

/**
 * ## createE2ePool
 *
 * Creates a database connection pool for e2e test seeding. Uses the same database
 * URL configuration as integration tests.
 *
 * @example
 * const pool = createE2ePool()
 * await seedPublisherUser(pool, { clerkId: 'user_123', email: 'test@example.com' })
 * await pool.end()
 */
export function createE2ePool(): pg.Pool {
	return new pg.Pool({
		connectionString: getTestDatabaseUrl(),
		max: 1,
	})
}
