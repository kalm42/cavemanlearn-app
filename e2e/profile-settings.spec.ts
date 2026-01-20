import { expect, test } from '@playwright/test'

test.describe('Profile Settings', () => {
	test('user updates display name', async ({ page }) => {
		// Initial profile state
		const initialProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'learner',
			displayName: 'Initial Name',
			avatarUrl: 'https://example.com/avatar.png',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		// Track updated profile state
		let currentProfile = { ...initialProfile }

		// Set up route mocks for API calls
		await page.route('**/api/user/profile', async (route) => {
			const method = route.request().method()

			if (method === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(currentProfile),
				})
			} else if (method === 'PUT') {
				const body = route.request().postDataJSON() as { displayName?: string }
				currentProfile = {
					...currentProfile,
					displayName: body.displayName ?? currentProfile.displayName,
					updatedAt: new Date().toISOString(),
				}
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(currentProfile),
				})
			} else {
				await route.continue()
			}
		})

		// Navigate to profile settings page
		await page.goto('/settings/profile')

		// Wait for the form to load
		await expect(page.getByRole('heading', { name: /profile information/i })).toBeVisible()

		// Verify initial display name is shown
		const displayNameInput = page.getByLabel(/display name/i)
		await expect(displayNameInput).toHaveValue('Initial Name')

		// Verify email is displayed and disabled
		const emailInput = page.getByLabel(/email/i)
		await expect(emailInput).toHaveValue('test@example.com')
		await expect(emailInput).toBeDisabled()

		// Verify avatar is displayed
		await expect(page.getByRole('img', { name: /avatar/i })).toBeVisible()

		// Clear and enter new display name
		await displayNameInput.clear()
		await displayNameInput.fill('Updated Name')

		// Submit the form
		const saveButton = page.getByRole('button', { name: /save changes/i })
		await expect(saveButton).toBeEnabled()
		await saveButton.click()

		// Verify success message appears
		await expect(page.getByText(/profile updated successfully/i)).toBeVisible()

		// Verify the new display name is in the input
		await expect(displayNameInput).toHaveValue('Updated Name')
	})

	test('save button is disabled when no changes are made', async ({ page }) => {
		const profile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'learner',
			displayName: 'Test User',
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		// Set up route mocks
		await page.route('**/api/user/profile', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(profile),
				})
			} else {
				await route.continue()
			}
		})

		// Navigate to profile settings page
		await page.goto('/settings/profile')

		// Wait for the form to load
		await expect(page.getByRole('heading', { name: /profile information/i })).toBeVisible()

		// Verify save button is disabled initially
		const saveButton = page.getByRole('button', { name: /save changes/i })
		await expect(saveButton).toBeDisabled()
	})

	test('settings layout has correct navigation', async ({ page }) => {
		const profile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'learner',
			displayName: 'Test User',
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		// Set up route mocks
		await page.route('**/api/user/profile', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(profile),
				})
			} else {
				await route.continue()
			}
		})

		// Navigate to profile settings page
		await page.goto('/settings/profile')

		// Verify settings page title is visible
		await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()

		// Verify profile nav item is visible and active
		const profileNavLink = page.getByRole('link', { name: /profile/i })
		await expect(profileNavLink).toBeVisible()

		// Verify back to home link is visible
		const backLink = page.getByRole('link', { name: /back to home/i })
		await expect(backLink).toBeVisible()
	})
})
