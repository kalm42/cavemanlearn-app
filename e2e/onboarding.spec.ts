import { expect, test } from '@playwright/test'

test.describe('Onboarding Flow', () => {
	test('new user completes onboarding as learner', async ({ page }) => {
		// Track whether profile has been created
		let profileCreated = false
		const createdProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'learner',
			displayName: null,
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		// Set up route mocks for API calls
		await page.route('**/api/user/profile', async (route) => {
			const method = route.request().method()

			if (method === 'GET') {
				if (profileCreated) {
					// After profile is created, return the profile
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(createdProfile),
					})
				} else {
					// Before profile is created, return 404
					await route.fulfill({
						status: 404,
						contentType: 'application/json',
						body: JSON.stringify({ error: 'Profile not found' }),
					})
				}
			} else if (method === 'POST') {
				// Mark profile as created and return it
				profileCreated = true
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify(createdProfile),
				})
			} else {
				await route.continue()
			}
		})

		// Navigate to onboarding page (user is already authenticated via setup)
		await page.goto('/onboarding')

		// Wait for the onboarding form to be visible
		await expect(page.getByRole('heading', { name: /welcome to cavemanlearn/i })).toBeVisible()

		// Verify both options are displayed
		const learnerOption = page.getByRole('button', { name: /i want to learn/i })
		const publisherOption = page.getByRole('button', { name: /i want to publish/i })

		await expect(learnerOption).toBeVisible()
		await expect(publisherOption).toBeVisible()

		// Select learner option
		await learnerOption.click()

		// Verify learner option is selected (check for selected indicator text)
		await expect(learnerOption.getByText(/selected/i)).toBeVisible()

		// Find and click the submit button
		const submitButton = page.getByRole('button', { name: /continue/i })
		await expect(submitButton).toBeEnabled()
		await submitButton.click()

		// After successful creation, user should be redirected to home page
		await expect(page).toHaveURL('/', { timeout: 15000 })

		// Verify user is no longer on onboarding page
		await expect(page.getByRole('heading', { name: /welcome to cavemanlearn/i })).toBeHidden()
	})

	test('new user completes onboarding as publisher', async ({ page }) => {
		// Track whether profile has been created
		let profileCreated = false
		const createdProfile = {
			id: '550e8400-e29b-41d4-a716-446655440001',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'publisher',
			displayName: null,
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		// Set up route mocks for API calls
		await page.route('**/api/user/profile', async (route) => {
			const method = route.request().method()

			if (method === 'GET') {
				if (profileCreated) {
					await route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(createdProfile),
					})
				} else {
					await route.fulfill({
						status: 404,
						contentType: 'application/json',
						body: JSON.stringify({ error: 'Profile not found' }),
					})
				}
			} else if (method === 'POST') {
				profileCreated = true
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify(createdProfile),
				})
			} else {
				await route.continue()
			}
		})

		// Navigate to onboarding page (user is already authenticated via setup)
		await page.goto('/onboarding')

		// Wait for the onboarding form to be visible
		await expect(page.getByRole('heading', { name: /welcome to cavemanlearn/i })).toBeVisible()

		// Verify both options are displayed
		const learnerOption = page.getByRole('button', { name: /i want to learn/i })
		const publisherOption = page.getByRole('button', { name: /i want to publish/i })

		await expect(learnerOption).toBeVisible()
		await expect(publisherOption).toBeVisible()

		// Select publisher option
		await publisherOption.click()

		// Verify publisher option is selected (check for selected indicator text)
		await expect(publisherOption.getByText(/selected/i)).toBeVisible()

		// Find and click the submit button
		const submitButton = page.getByRole('button', { name: /continue/i })
		await expect(submitButton).toBeEnabled()
		await submitButton.click()

		// After successful creation, user should be redirected to home page
		await expect(page).toHaveURL('/', { timeout: 15000 })

		// Verify user is no longer on onboarding page
		await expect(page.getByRole('heading', { name: /welcome to cavemanlearn/i })).toBeHidden()
	})

	test('onboarding form requires selection before submission', async ({ page }) => {
		// Set up route mocks for API calls
		await page.route('**/api/user/profile', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 404,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'Profile not found' }),
				})
			} else {
				await route.continue()
			}
		})

		await page.goto('/onboarding')

		// Wait for the form to be visible
		await expect(page.getByRole('heading', { name: /welcome to cavemanlearn/i })).toBeVisible()

		// Submit button should be disabled when no option is selected
		const submitButton = page.getByRole('button', { name: /continue/i })
		await expect(submitButton).toBeDisabled()
	})

	test('user with existing profile is redirected away from onboarding', async ({ page }) => {
		// Set up route mocks to return an existing profile
		await page.route('**/api/user/profile', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						id: '550e8400-e29b-41d4-a716-446655440000',
						clerkId: 'user_test_123',
						email: 'test@example.com',
						userType: 'learner',
						displayName: null,
						avatarUrl: null,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString(),
					}),
				})
			} else {
				await route.continue()
			}
		})

		// Navigate to onboarding page
		await page.goto('/onboarding')

		// If user has a profile, they should be redirected away from onboarding
		await expect(page).not.toHaveURL(/\/onboarding/)

		// The onboarding form should not be visible
		await expect(page.getByRole('heading', { name: /welcome to cavemanlearn/i })).toBeHidden()
	})
})
