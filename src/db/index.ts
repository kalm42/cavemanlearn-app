import { drizzle } from 'drizzle-orm/node-postgres'

import * as schema from './schema.ts'

// Create production db instance
// Disabling this here because I don't want to import the type safe env variable here.
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const productionDb = drizzle(process.env.DATABASE_URL!, { schema })

/**
 * Gets the database instance. In integration tests, returns globalThis.testDb if available,
 * otherwise returns the production database. This allows integration tests to use the real
 * test database without mocking.
 */
function getDb() {
	if ('testDb' in globalThis) {
		return globalThis.testDb
	}
	return productionDb
}

// Export db as a Proxy so it's evaluated at access time, not module load time
// This allows integration tests to use globalThis.testDb when it's available
export const db = new Proxy(productionDb, {
	get(_target, prop) {
		const dbInstance = getDb()
		// Access properties dynamically - both productionDb and testDb have the same interface
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
		return (dbInstance as unknown as any)[prop]
	},
})
