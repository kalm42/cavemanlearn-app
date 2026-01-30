import { expect, test } from '@playwright/test'

test.describe('Publisher Organizations', () => {
	test('publisher sees their organizations', async ({ page }) => {
		const publisherProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'publisher',
			displayName: 'Test Publisher',
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		const organizations = {
			organizations: [
				{
					id: '550e8400-e29b-41d4-a716-446655440001',
					name: 'Test Organization',
					slug: 'test-organization',
					description: 'A test organization for publishing',
					logoUrl: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					role: 'owner',
					memberCount: 5,
				},
				{
					id: '550e8400-e29b-41d4-a716-446655440002',
					name: 'Another Org',
					slug: 'another-org',
					description: 'Another organization',
					logoUrl: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					role: 'editor',
					memberCount: 3,
				},
			],
		}

		await page.route('**/api/user/profile', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(publisherProfile),
				})
			} else {
				await route.continue()
			}
		})

		await page.route('**/api/organizations', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(organizations),
				})
			} else {
				await route.continue()
			}
		})

		await page.goto('/publisher/organizations')

		await expect(page.getByRole('heading', { name: /my organizations/i })).toBeVisible()

		await expect(page.getByRole('heading', { name: 'Test Organization' })).toBeVisible()
		await expect(page.getByRole('heading', { name: 'Another Org' })).toBeVisible()

		await expect(page.getByText('Owner')).toBeVisible()
		await expect(page.getByText('Editor')).toBeVisible()

		await expect(page.getByText('A test organization for publishing')).toBeVisible()

		await expect(page.getByRole('link', { name: /create organization/i }).first()).toBeVisible()
	})

	test('publisher sees empty state when no organizations', async ({ page }) => {
		const publisherProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'publisher',
			displayName: 'Test Publisher',
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		await page.route('**/api/user/profile', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(publisherProfile),
				})
			} else {
				await route.continue()
			}
		})

		await page.route('**/api/organizations', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ organizations: [] }),
				})
			} else {
				await route.continue()
			}
		})

		await page.goto('/publisher/organizations')

		await expect(page.getByRole('heading', { name: /my organizations/i })).toBeVisible()

		await expect(page.getByText(/no organizations yet/i)).toBeVisible()
		await expect(
			page.getByText(/create your first organization to start publishing content/i),
		).toBeVisible()

		await expect(page.getByRole('link', { name: /create organization/i }).first()).toBeVisible()
	})

	test('non-publisher user is denied access', async ({ page }) => {
		const learnerProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'learner',
			displayName: 'Test Learner',
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		await page.route('**/api/user/profile', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(learnerProfile),
				})
			} else {
				await route.continue()
			}
		})

		await page.goto('/publisher/organizations')

		await expect(page.getByText(/access denied/i)).toBeVisible()
		await expect(
			page.getByText(/this area is only available to publisher accounts/i),
		).toBeVisible()

		await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible()
	})

	test('publisher can navigate to organization dashboard', async ({ page }) => {
		const publisherProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'publisher',
			displayName: 'Test Publisher',
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		const orgId = '550e8400-e29b-41d4-a716-446655440001'
		const organizations = {
			organizations: [
				{
					id: orgId,
					name: 'Test Organization',
					slug: 'test-organization',
					description: 'A test organization',
					logoUrl: null,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					role: 'owner',
					memberCount: 1,
				},
			],
		}

		await page.route('**/api/user/profile', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(publisherProfile),
				})
			} else {
				await route.continue()
			}
		})

		await page.route('**/api/organizations', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(organizations),
				})
			} else {
				await route.continue()
			}
		})

		await page.goto('/publisher/organizations')

		await expect(page.getByRole('heading', { name: 'Test Organization' })).toBeVisible()

		await page.getByRole('heading', { name: 'Test Organization' }).click()

		await expect(page).toHaveURL(`/publisher/organizations/${orgId}`)
	})

	test('publisher layout has correct sidebar navigation', async ({ page }) => {
		const publisherProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'publisher',
			displayName: 'Test Publisher',
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		await page.route('**/api/user/profile', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(publisherProfile),
				})
			} else {
				await route.continue()
			}
		})

		await page.route('**/api/organizations', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ organizations: [] }),
				})
			} else {
				await route.continue()
			}
		})

		await page.goto('/publisher/organizations')

		await expect(page.getByRole('heading', { name: /publisher dashboard/i })).toBeVisible()

		await expect(page.getByRole('link', { name: /organizations/i })).toBeVisible()

		await expect(page.getByRole('link', { name: /back to home/i })).toBeVisible()
	})

	test('publisher creates new organization', async ({ page }) => {
		const publisherProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'publisher',
			displayName: 'Test Publisher',
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		const createdOrg = {
			organization: {
				id: '550e8400-e29b-41d4-a716-446655440010',
				name: 'My New Organization',
				slug: 'my-new-organization',
				description: 'A wonderful new organization',
				logoUrl: null,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			membership: {
				id: '660e8400-e29b-41d4-a716-446655440011',
				organizationId: '550e8400-e29b-41d4-a716-446655440010',
				userId: '550e8400-e29b-41d4-a716-446655440000',
				role: 'owner',
				createdAt: new Date().toISOString(),
			},
		}

		await page.route('**/api/user/profile', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(publisherProfile),
				})
			} else {
				await route.continue()
			}
		})

		await page.route('**/api/organizations', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ organizations: [] }),
				})
			} else if (route.request().method() === 'POST') {
				await route.fulfill({
					status: 201,
					contentType: 'application/json',
					body: JSON.stringify(createdOrg),
				})
			} else {
				await route.continue()
			}
		})

		// Navigate to create organization page
		await page.goto('/publisher/organizations/new')

		// Verify the form is displayed
		await expect(page.getByRole('heading', { name: /create organization/i })).toBeVisible()

		// Fill out the form
		await page.getByLabel(/organization name/i).fill('My New Organization')
		await page.getByLabel(/description/i).fill('A wonderful new organization')

		// Verify slug preview updates
		await expect(page.getByText('my-new-organization', { exact: true })).toBeVisible()

		// Submit the form
		await page.getByRole('button', { name: /create organization/i }).click()

		// Should redirect to the new organization's dashboard
		await expect(page).toHaveURL(`/publisher/organizations/${createdOrg.organization.id}`)
	})

	test('publisher sees validation error when name is empty', async ({ page }) => {
		const publisherProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'publisher',
			displayName: 'Test Publisher',
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		await page.route('**/api/user/profile', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(publisherProfile),
				})
			} else {
				await route.continue()
			}
		})

		await page.goto('/publisher/organizations/new')

		// Verify the form is displayed
		await expect(page.getByRole('heading', { name: /create organization/i })).toBeVisible()

		// Submit button should be disabled when name is empty
		const submitButton = page.getByRole('button', { name: /create organization/i })
		await expect(submitButton).toBeDisabled()

		// Verify default slug preview is shown
		await expect(page.getByText('your-organization', { exact: true })).toBeVisible()
	})

	test('publisher sees error when creating organization with duplicate name', async ({ page }) => {
		const publisherProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'publisher',
			displayName: 'Test Publisher',
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		await page.route('**/api/user/profile', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(publisherProfile),
				})
			} else {
				await route.continue()
			}
		})

		await page.route('**/api/organizations', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ organizations: [] }),
				})
			} else if (route.request().method() === 'POST') {
				// Return 409 conflict for duplicate organization
				await route.fulfill({
					status: 409,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'Organization with this slug already exists' }),
				})
			} else {
				await route.continue()
			}
		})

		// Navigate to create organization page
		await page.goto('/publisher/organizations/new')

		// Fill out the form
		await page.getByLabel(/organization name/i).fill('Existing Organization')
		await page.getByLabel(/description/i).fill('This name already exists')

		// Submit the form
		await page.getByRole('button', { name: /create organization/i }).click()

		// Should see the duplicate error message
		await expect(
			page.getByText(/an organization with this name already exists/i),
		).toBeVisible()

		// Should still be on the create page (not redirected)
		await expect(page).toHaveURL('/publisher/organizations/new')
	})

	test('publisher can navigate from organization list to create page', async ({ page }) => {
		const publisherProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_test_123',
			email: 'test@example.com',
			userType: 'publisher',
			displayName: 'Test Publisher',
			avatarUrl: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		}

		await page.route('**/api/user/profile', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(publisherProfile),
				})
			} else {
				await route.continue()
			}
		})

		await page.route('**/api/organizations', async (route) => {
			if (route.request().method() === 'GET') {
				await route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({ organizations: [] }),
				})
			} else {
				await route.continue()
			}
		})

		// Start at the organizations list
		await page.goto('/publisher/organizations')

		// Click the "Create Organization" button
		await page.getByRole('link', { name: /create organization/i }).first().click()

		// Should navigate to the create page
		await expect(page).toHaveURL('/publisher/organizations/new')
		await expect(page.getByRole('heading', { name: /create organization/i })).toBeVisible()
	})
})
