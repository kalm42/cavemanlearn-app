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
})
