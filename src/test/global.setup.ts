/* eslint-disable playwright/no-standalone-expect */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { createClerkClient } from '@clerk/backend'
import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { expect, test as setup } from '@playwright/test'

import {
	cleanupTestOrganizations,
	createE2ePool,
	seedPublisherUser,
	seedTestMemberUser,
} from './e2e-seed'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to store authenticated state
const authFile = path.join(__dirname, '../../playwright/.clerk/user.json')
setup.describe.configure({ mode: 'serial' })

/**
 * First setup: Initialize Clerk testing
 */
setup('initialize clerk testing', async () => {
	await clerkSetup()
})

/**
 * Second setup: Authenticate and save state to storage
 * This runs after clerkSetup and saves the auth state for reuse in tests
 */
setup('authenticate and save state to storage', async ({ page }) => {
	const username = process.env.E2E_CLERK_USER_USERNAME
	const password = process.env.E2E_CLERK_USER_PASSWORD

	if (!username || !password) {
		throw new Error('E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD must be set in .env.local')
	}

	// Navigate to app and wait for Clerk to load (Sign in button visible)
	await page.goto('/')
	await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

	// Sign in with test credentials
	await clerk.signIn({
		page,
		signInParams: {
			strategy: 'password',
			identifier: username,
			password: password,
		},
	})

	// Reload and wait for authenticated state (Sign in button should be hidden)
	await page.reload()
	await expect(page.getByRole('button', { name: /sign in/i })).toBeHidden()

	// Save the authenticated state
	await page.context().storageState({ path: authFile })
})

/**
 * Third setup: Seed database with test user as publisher and clean up previous test data
 */
setup('seed database for e2e tests', async () => {
	const email = process.env.E2E_CLERK_USER_USERNAME
	const secretKey = process.env.CLERK_SECRET_KEY

	if (!email) {
		throw new Error('E2E_CLERK_USER_USERNAME must be set in .env.local')
	}

	if (!secretKey) {
		throw new Error('CLERK_SECRET_KEY must be set in .env.local')
	}

	// Look up the Clerk user ID from the email
	const clerkClient = createClerkClient({ secretKey })
	const users = await clerkClient.users.getUserList({ emailAddress: [email] })

	if (users.data.length === 0) {
		throw new Error(`No Clerk user found with email: ${email}`)
	}

	const clerkId = users.data[0].id

	const pool = createE2ePool()
	try {
		// Clean up test organizations from previous runs
		await cleanupTestOrganizations(pool)

		// Ensure the test user exists as a publisher
		await seedPublisherUser(pool, { clerkId, email })

		// Seed a test member user for member management tests
		await seedTestMemberUser(pool)
	} finally {
		await pool.end()
	}
})

export { authFile }
