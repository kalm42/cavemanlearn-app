/* eslint-disable playwright/no-standalone-expect */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'
import { clerk, clerkSetup } from '@clerk/testing/playwright'
import { expect, test as setup } from '@playwright/test'

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

export { authFile }
