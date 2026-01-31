import { expect, test } from '@playwright/test'

// Use the stored auth state from global setup (includes Testing Token)
// The global setup authenticates the user and seeds them as a publisher

test.describe('Publisher Organizations', () => {
	test('publisher can access organizations page', async ({ page }) => {
		await page.goto('/publisher/organizations')

		// Wait for the page to fully load
		await expect(page.getByRole('heading', { name: /my organizations/i })).toBeVisible()

		// Should see create organization link
		await expect(page.getByRole('link', { name: /create organization/i }).first()).toBeVisible()
	})

	test('publisher can create an organization', async ({ page }) => {
		await page.goto('/publisher/organizations/new')

		// Wait for the form to be displayed
		await expect(page.getByRole('heading', { name: /create organization/i })).toBeVisible({
			timeout: 15000,
		})

		// Fill out the form with a unique name
		const orgName = `E2E Test Org ${String(Date.now())}`
		await page.getByLabel(/organization name/i).fill(orgName)
		await page.getByLabel(/description/i).fill('Created by e2e test')

		// Submit the form
		await page.getByRole('button', { name: /create organization/i }).click()

		// Should redirect to the organization's dashboard
		await expect(page).toHaveURL(/\/publisher\/organizations\/[a-f0-9-]+/, { timeout: 15000 })
	})

	test('publisher cannot create an invalid organization', async ({ page }) => {
		await page.goto('/publisher/organizations/new')

		// Wait for the form to be displayed
		await expect(page.getByRole('heading', { name: /create organization/i })).toBeVisible({
			timeout: 15000,
		})

		const nameInput = page.getByLabel(/organization name/i)
		const submitButton = page.getByRole('button', { name: /create organization/i })

		// Empty name - submit should be disabled
		await expect(submitButton).toBeDisabled()

		// Fill name, then clear it - submit should become disabled again
		await nameInput.fill('Test Org')
		await expect(submitButton).toBeEnabled()
		await nameInput.clear()
		await expect(submitButton).toBeDisabled()
	})

	test('publisher can navigate from organization list to create page', async ({ page }) => {
		await page.goto('/publisher/organizations')

		// Wait for page to load
		await expect(page.getByRole('heading', { name: /my organizations/i })).toBeVisible({
			timeout: 15000,
		})

		// Click the "Create Organization" button
		await page
			.getByRole('link', { name: /create organization/i })
			.first()
			.click()

		// Should navigate to the create page
		await expect(page).toHaveURL('/publisher/organizations/new')
		await expect(page.getByRole('heading', { name: /create organization/i })).toBeVisible()
	})
})
