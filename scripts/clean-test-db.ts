#!/usr/bin/env tsx
/**
 * ## clean-test-db
 *
 * Cleans the test database by truncating all tables. This ensures a fresh
 * state for integration tests, particularly important in CI environments where
 * the database container may persist between runs.
 *
 * This script connects to the database, retrieves all table names from the
 * public schema, and truncates them with CASCADE to handle foreign key constraints.
 */

import { config as dotenvConfig } from 'dotenv'
import pg from 'pg'

dotenvConfig({ path: ['.env.local', '.env'] })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
	console.error('Error: DATABASE_URL environment variable is required')
	process.exit(1)
}

async function cleanDatabase(): Promise<void> {
	const client = new pg.Client({ connectionString: DATABASE_URL })

	try {
		await client.connect()
		console.log('Connected to database')

		// Get all table names from the public schema
		const result = await client.query<{ tablename: string }>(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `)

		const tables = result.rows.map((row) => row.tablename)

		if (tables.length === 0) {
			console.log('No tables found to clean')
			return
		}

		console.log(`Found ${tables.length} table(s) to clean: ${tables.join(', ')}`)

		// Truncate all tables with CASCADE to handle foreign keys
		// RESTART IDENTITY resets auto-increment sequences
		for (const table of tables) {
			await client.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`)
			console.log(`Truncated table: ${table}`)
		}

		console.log('Database cleaned successfully')
	} catch (error) {
		console.error('Error cleaning database:', error)
		process.exit(1)
	} finally {
		await client.end()
	}
}

cleanDatabase().catch((error: unknown) => {
	console.error('Unexpected error:', error)
	process.exit(1)
})
