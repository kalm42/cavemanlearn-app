import { expect, test } from '@playwright/test'

import { E2E_TEST_MEMBER_EMAIL } from '../src/test/e2e-seed'

// Use the stored auth state from global setup (includes Testing Token)
// The global setup authenticates the user and seeds them as a publisher

test.describe('Publisher Organizations', () => {
	test('publisher can access organizations page', async ({ page }) => {
		await page.goto('/publisher/organizations')

		// Wait for the page to fully load
		await expect(page.getByRole('heading', { name: /my organizations/i })).toBeVisible({
			timeout: 15000,
		})

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
		await expect(page.getByRole('heading', { name: /create organization/i })).toBeVisible({
			timeout: 15000,
		})
	})

	test('owner can update organization name', async ({ page }) => {
		// First create an organization
		await page.goto('/publisher/organizations/new')
		await expect(page.getByRole('heading', { name: /create organization/i })).toBeVisible({
			timeout: 15000,
		})

		const originalName = `Update Test Org ${String(Date.now())}`
		await page.getByLabel(/organization name/i).fill(originalName)
		await page.getByLabel(/description/i).fill('Organization for update test')
		await page.getByRole('button', { name: /create organization/i }).click()

		// Should redirect to the organization's dashboard
		await expect(page).toHaveURL(/\/publisher\/organizations\/[a-f0-9-]+/, { timeout: 15000 })

		// Wait for dashboard to load, then navigate to settings
		await expect(page.getByRole('link', { name: 'Settings', exact: true })).toBeVisible({
			timeout: 15000,
		})
		await page.getByRole('link', { name: 'Settings', exact: true }).click()

		// Wait for settings page to load
		await expect(page.getByText(/general information/i)).toBeVisible({ timeout: 15000 })

		// Update the organization name
		const newName = `Updated Org Name ${String(Date.now())}`
		const nameInput = page.getByLabel(/organization name/i)
		await nameInput.clear()
		await nameInput.fill(newName)

		// Save changes
		await page.getByRole('button', { name: /save changes/i }).click()

		// Wait for success message
		await expect(page.getByText(/organization settings saved successfully/i)).toBeVisible({
			timeout: 15000,
		})

		// Verify the name was updated (refresh and check)
		await page.reload()
		await expect(page.getByLabel(/organization name/i)).toHaveValue(newName, { timeout: 15000 })
	})

	test('owner can delete organization', async ({ page }) => {
		// First create an organization
		await page.goto('/publisher/organizations/new')
		await expect(page.getByRole('heading', { name: /create organization/i })).toBeVisible({
			timeout: 15000,
		})

		// Dismiss any PostHog survey overlay that might steal focus by pressing Escape
		await page.keyboard.press('Escape')

		const orgName = `Delete Test Org ${String(Date.now())}`
		const nameInput = page.getByLabel(/organization name/i)
		await nameInput.click()
		await nameInput.fill(orgName)
		await page.getByLabel(/description/i).fill('Organization for delete test')
		await page.getByRole('button', { name: /create organization/i }).click()

		// Should redirect to the organization's dashboard
		await expect(page).toHaveURL(/\/publisher\/organizations\/[a-f0-9-]+/, { timeout: 15000 })

		// Wait for dashboard to load, then navigate to settings
		await expect(page.getByRole('link', { name: 'Settings', exact: true })).toBeVisible({
			timeout: 15000,
		})
		await page.getByRole('link', { name: 'Settings', exact: true }).click()

		// Wait for settings page to load
		await expect(page.getByText(/general information/i)).toBeVisible({ timeout: 15000 })

		// Click the delete button in the danger zone
		await page.getByRole('button', { name: /delete organization/i }).click()

		// Confirm deletion in the modal
		await expect(page.getByText(/are you sure you want to delete/i)).toBeVisible()
		await page.getByRole('button', { name: /yes, delete organization/i }).click()

		// Should redirect to organizations list
		await expect(page).toHaveURL('/publisher/organizations', { timeout: 15000 })

		// Wait for the organizations list to load before checking
		await expect(page.getByRole('heading', { name: /my organizations/i })).toBeVisible({
			timeout: 15000,
		})

		// The deleted organization should not be visible
		await expect(page.getByText(orgName)).toBeHidden()
	})
})

test.describe('Organization Member Management', () => {
	test('owner can add a new member', async ({ page }) => {
		// First create an organization
		await page.goto('/publisher/organizations/new')
		await expect(page.getByRole('heading', { name: /create organization/i })).toBeVisible({
			timeout: 15000,
		})

		await page.keyboard.press('Escape')

		const orgName = `E2E Test Members Org ${String(Date.now())}`
		const nameInput = page.getByLabel(/organization name/i)
		await nameInput.click()
		await nameInput.fill(orgName)
		await page.getByRole('button', { name: /create organization/i }).click()

		// Should redirect to the organization's dashboard
		await expect(page).toHaveURL(/\/publisher\/organizations\/[a-f0-9-]+/, { timeout: 15000 })

		// Navigate to members page
		await expect(page.getByRole('link', { name: 'Members', exact: true })).toBeVisible({
			timeout: 15000,
		})
		await page.getByRole('link', { name: 'Members', exact: true }).click()

		// Wait for members page to load (use level: 1 to target the h1, not the dashboard h3)
		await expect(page.getByRole('heading', { name: 'Members', level: 1 })).toBeVisible({
			timeout: 15000,
		})

		// Click the "Add Member" button (the one outside the modal)
		await page.getByRole('button', { name: /add member/i }).click()

		// Fill in the email of the test member user (seeded in global setup)
		const dialog = page.getByRole('dialog')
		await expect(dialog.getByLabel(/email address/i)).toBeVisible()
		await dialog.getByLabel(/email address/i).fill(E2E_TEST_MEMBER_EMAIL)

		// Select a role (scope to dialog to avoid ambiguity)
		await dialog.getByRole('combobox').selectOption('editor')

		// Submit the form (scope to dialog to target the submit button, not the trigger)
		await dialog.getByRole('button', { name: /add member/i }).click()

		// Wait for success message
		await expect(page.getByText(/member added successfully/i)).toBeVisible({ timeout: 15000 })

		// The new member should appear in the list
		await expect(page.getByText(E2E_TEST_MEMBER_EMAIL)).toBeVisible()
		await expect(page.getByText('E2E Test Member', { exact: true })).toBeVisible()
	})

	test('owner can change member role', async ({ page }) => {
		// First create an organization and add a member
		await page.goto('/publisher/organizations/new')
		await expect(page.getByRole('heading', { name: /create organization/i })).toBeVisible({
			timeout: 15000,
		})

		await page.keyboard.press('Escape')

		const orgName = `E2E Test Role Change Org ${String(Date.now())}`
		const nameInput = page.getByLabel(/organization name/i)
		await nameInput.click()
		await nameInput.fill(orgName)
		await page.getByRole('button', { name: /create organization/i }).click()

		// Should redirect to the organization's dashboard
		await expect(page).toHaveURL(/\/publisher\/organizations\/[a-f0-9-]+/, { timeout: 15000 })

		// Navigate to members page
		await expect(page.getByRole('link', { name: 'Members', exact: true })).toBeVisible({
			timeout: 15000,
		})
		await page.getByRole('link', { name: 'Members', exact: true }).click()

		// Wait for members page to load (use level: 1 to target the h1, not the dashboard h3)
		await expect(page.getByRole('heading', { name: 'Members', level: 1 })).toBeVisible({
			timeout: 15000,
		})

		// Add a member first
		await page.getByRole('button', { name: /add member/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog.getByLabel(/email address/i)).toBeVisible()
		await dialog.getByLabel(/email address/i).fill(E2E_TEST_MEMBER_EMAIL)
		await dialog.getByRole('combobox').selectOption('viewer')
		await dialog.getByRole('button', { name: /add member/i }).click()
		await expect(page.getByText(/member added successfully/i)).toBeVisible({ timeout: 15000 })

		// Wait for the modal to close and the list to update
		await expect(page.getByText(E2E_TEST_MEMBER_EMAIL)).toBeVisible()

		// Find the member's row and change their role
		// The role selector for the member (not in the modal) should be in the table
		const memberRow = page.locator('tr', { has: page.getByText(E2E_TEST_MEMBER_EMAIL) })
		const roleSelector = memberRow.getByRole('combobox')
		await roleSelector.selectOption('admin')

		// Wait for success message
		await expect(page.getByText(/role updated successfully/i)).toBeVisible({ timeout: 15000 })
	})

	test('owner can remove a member', async ({ page }) => {
		// First create an organization and add a member
		await page.goto('/publisher/organizations/new')
		await expect(page.getByRole('heading', { name: /create organization/i })).toBeVisible({
			timeout: 15000,
		})

		await page.keyboard.press('Escape')

		const orgName = `E2E Test Remove Member Org ${String(Date.now())}`
		const nameInput = page.getByLabel(/organization name/i)
		await nameInput.click()
		await nameInput.fill(orgName)
		await page.getByRole('button', { name: /create organization/i }).click()

		// Should redirect to the organization's dashboard
		await expect(page).toHaveURL(/\/publisher\/organizations\/[a-f0-9-]+/, { timeout: 15000 })

		// Navigate to members page
		await expect(page.getByRole('link', { name: 'Members', exact: true })).toBeVisible({
			timeout: 15000,
		})
		await page.getByRole('link', { name: 'Members', exact: true }).click()

		// Wait for members page to load (use level: 1 to target the h1, not the dashboard h3)
		await expect(page.getByRole('heading', { name: 'Members', level: 1 })).toBeVisible({
			timeout: 15000,
		})

		// Add a member first
		await page.getByRole('button', { name: /add member/i }).click()
		const dialog = page.getByRole('dialog')
		await expect(dialog.getByLabel(/email address/i)).toBeVisible()
		await dialog.getByLabel(/email address/i).fill(E2E_TEST_MEMBER_EMAIL)
		await dialog.getByRole('combobox').selectOption('viewer')
		await dialog.getByRole('button', { name: /add member/i }).click()
		await expect(page.getByText(/member added successfully/i)).toBeVisible({ timeout: 15000 })

		// Wait for the modal to close and the list to update
		await expect(page.getByText(E2E_TEST_MEMBER_EMAIL)).toBeVisible()

		// Find the member's row and click the remove button
		const memberRow = page.locator('tr', { has: page.getByText(E2E_TEST_MEMBER_EMAIL) })
		const removeButton = memberRow.getByRole('button', { name: /remove/i })
		await removeButton.click()

		// Confirm the removal in the modal
		await expect(page.getByText(/are you sure you want to remove/i)).toBeVisible()
		await page.getByRole('button', { name: /yes, remove member/i }).click()

		// Wait for success message
		await expect(page.getByText(/member removed successfully/i)).toBeVisible({ timeout: 15000 })

		// The member should no longer be in the list
		await expect(page.getByText(E2E_TEST_MEMBER_EMAIL)).toBeHidden()
	})
})
