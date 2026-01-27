import { beforeEach, describe, expect, it, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import { handleClerkWebhook } from '../api.webhooks.clerk'
import { userProfiles } from '@/db/schema.ts'

// Create mock for svix Webhook.verify method using vi.hoisted to ensure
// it's available during vi.mock hoisting
const mockVerify = vi.hoisted(() => vi.fn())

vi.mock('svix', () => {
	return {
		Webhook: vi.fn().mockImplementation(function () {
			return { verify: mockVerify }
		}),
	}
})

vi.mock('@/env', () => ({
	env: {
		CLERK_WEBHOOK_SECRET: 'test-webhook-secret',
	},
}))

/**
 * ## createMockWebhookRequest
 *
 * Creates a mock webhook request with the given event type and user data.
 * Sets up the Svix mock to return the expected payload.
 */
function createMockWebhookRequest(
	eventType: string,
	userData: {
		id: string
		email_addresses: Array<{ id: string; email_address: string }>
		primary_email_address_id: string | null
		image_url?: string | null
		first_name?: string | null
		last_name?: string | null
	},
): Request {
	const payload = {
		type: eventType,
		data: userData,
	}

	mockVerify.mockReturnValue(payload)

	return new Request('http://localhost/api/webhooks/clerk', {
		method: 'POST',
		headers: {
			'svix-id': 'msg_123',
			'svix-timestamp': String(Date.now()),
			'svix-signature': 'v1,signature',
		},
		body: JSON.stringify(payload),
	})
}

/**
 * ## Clerk Webhook Handler - Integration Tests
 *
 * Tests for the Clerk webhook handler including signature verification
 * and event handling for user.created, user.updated, and user.deleted events.
 */
describe('POST /api/webhooks/clerk - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when signature verification fails', async () => {
		// Silence console.error we expect it
		vi.spyOn(console, 'error').mockImplementation(() => {})
		// Arrange
		mockVerify.mockImplementation(() => {
			throw new Error('Invalid signature')
		})

		const request = new Request('http://localhost/api/webhooks/clerk', {
			method: 'POST',
			headers: {
				'svix-id': 'msg_123',
				'svix-timestamp': String(Date.now()),
				'svix-signature': 'v1,invalid',
			},
			body: JSON.stringify({ type: 'user.created', data: {} }),
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: 'Invalid webhook signature' })
	})

	it('returns 401 when Svix headers are missing', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		const request = new Request('http://localhost/api/webhooks/clerk', {
			method: 'POST',
			body: JSON.stringify({ type: 'user.created', data: {} }),
		})

		const response = await handleClerkWebhook(request)

		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: 'Invalid webhook signature' })
	})

	it('ignores unknown event types', async () => {
		// Arrange
		const request = createMockWebhookRequest('unknown.event', {
			id: 'user_unknown',
			email_addresses: [{ id: 'email_1', email_address: 'unknown@example.com' }],
			primary_email_address_id: 'email_1',
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body).toEqual({ received: true })
	})

	it('returns 401 when payload schema is invalid', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		// Arrange - Create a payload that will pass signature verification
		// but fail schema validation
		mockVerify.mockReturnValue({
			type: 'user.created',
			data: {
				id: 'user_error',
				email_addresses: 'not-an-array', // Invalid: should be an array
				primary_email_address_id: null,
			},
		})

		const request = new Request('http://localhost/api/webhooks/clerk', {
			method: 'POST',
			headers: {
				'svix-id': 'msg_123',
				'svix-timestamp': String(Date.now()),
				'svix-signature': 'v1,signature',
			},
			body: JSON.stringify({}),
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert - Invalid schema causes verification to return null -> 401
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: 'Invalid webhook signature' })
	})
})

/**
 * ## user.created event - Integration Tests
 */
describe('user.created event - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('creates a new user profile', async () => {
		// Arrange
		const userId = 'user_created_new'
		const email = 'created@example.com'
		const request = createMockWebhookRequest('user.created', {
			id: userId,
			email_addresses: [{ id: 'email_1', email_address: email }],
			primary_email_address_id: 'email_1',
			image_url: 'https://example.com/avatar.png',
			first_name: 'John',
			last_name: 'Doe',
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body).toEqual({ received: true })

		// Verify profile was created
		const [profile] = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, userId))
			.limit(1)

		expect(profile).toBeTruthy()
		expect(profile.clerkId).toBe(userId)
		expect(profile.email).toBe(email)
		expect(profile.avatarUrl).toBe('https://example.com/avatar.png')
		expect(profile.displayName).toBe('John Doe')
		expect(profile.userType).toBe('learner')
	})

	it('uses first email when no primary email is set', async () => {
		// Arrange
		const userId = 'user_no_primary'
		const email = 'first@example.com'
		const request = createMockWebhookRequest('user.created', {
			id: userId,
			email_addresses: [
				{ id: 'email_1', email_address: email },
				{ id: 'email_2', email_address: 'second@example.com' },
			],
			primary_email_address_id: null,
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(200)

		const [profile] = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, userId))
			.limit(1)

		expect(profile.email).toBe(email)
	})

	it('does not create duplicate profile if user already exists', async () => {
		// Arrange
		const userId = 'user_existing'
		const email = 'existing@example.com'

		// Create existing profile
		await globalThis.testDb.insert(userProfiles).values({
			clerkId: userId,
			email,
			userType: 'publisher',
		})

		const request = createMockWebhookRequest('user.created', {
			id: userId,
			email_addresses: [{ id: 'email_1', email_address: email }],
			primary_email_address_id: 'email_1',
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(200)

		// Verify only one profile exists and it's still the original
		const profiles = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, userId))

		expect(profiles.length).toBe(1)
		expect(profiles[0].userType).toBe('publisher')
	})

	it('handles user without names', async () => {
		// Arrange
		const userId = 'user_no_name'
		const email = 'noname@example.com'
		const request = createMockWebhookRequest('user.created', {
			id: userId,
			email_addresses: [{ id: 'email_1', email_address: email }],
			primary_email_address_id: 'email_1',
			first_name: null,
			last_name: null,
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(200)

		const [profile] = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, userId))
			.limit(1)

		expect(profile.displayName).toBeNull()
	})

	it('does not create profile when email_addresses is empty', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})

		// Arrange
		const userId = 'user_no_emails'
		const request = createMockWebhookRequest('user.created', {
			id: userId,
			email_addresses: [],
			primary_email_address_id: null,
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(200)

		const profiles = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, userId))

		expect(profiles.length).toBe(0)
	})
})

/**
 * ## user.updated event - Integration Tests
 */
describe('user.updated event - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('updates email when it changes', async () => {
		// Arrange
		const userId = 'user_update_email'
		const originalEmail = 'original@example.com'
		const newEmail = 'updated@example.com'

		await globalThis.testDb.insert(userProfiles).values({
			clerkId: userId,
			email: originalEmail,
			userType: 'learner',
		})

		const request = createMockWebhookRequest('user.updated', {
			id: userId,
			email_addresses: [{ id: 'email_1', email_address: newEmail }],
			primary_email_address_id: 'email_1',
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(200)

		const [profile] = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, userId))
			.limit(1)

		expect(profile.email).toBe(newEmail)
	})

	it('updates avatar when it changes', async () => {
		// Arrange
		const userId = 'user_update_avatar'
		const email = 'avatar@example.com'

		await globalThis.testDb.insert(userProfiles).values({
			clerkId: userId,
			email,
			avatarUrl: 'https://example.com/old.png',
			userType: 'learner',
		})

		const request = createMockWebhookRequest('user.updated', {
			id: userId,
			email_addresses: [{ id: 'email_1', email_address: email }],
			primary_email_address_id: 'email_1',
			image_url: 'https://example.com/new.png',
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(200)

		const [profile] = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, userId))
			.limit(1)

		expect(profile.avatarUrl).toBe('https://example.com/new.png')
	})

	it('creates profile if it does not exist', async () => {
		// Arrange
		const userId = 'user_update_new'
		const email = 'updatenew@example.com'

		const request = createMockWebhookRequest('user.updated', {
			id: userId,
			email_addresses: [{ id: 'email_1', email_address: email }],
			primary_email_address_id: 'email_1',
			image_url: 'https://example.com/avatar.png',
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(200)

		const [profile] = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, userId))
			.limit(1)

		expect(profile).toBeTruthy()
		expect(profile.email).toBe(email)
	})

	it('does not update when nothing has changed', async () => {
		// Arrange
		const userId = 'user_no_changes'
		const email = 'nochanges@example.com'
		const avatarUrl = 'https://example.com/same.png'

		const [originalProfile] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: userId,
				email,
				avatarUrl,
				userType: 'learner',
			})
			.returning()

		const request = createMockWebhookRequest('user.updated', {
			id: userId,
			email_addresses: [{ id: 'email_1', email_address: email }],
			primary_email_address_id: 'email_1',
			image_url: avatarUrl,
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(200)

		const [profile] = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, userId))
			.limit(1)

		// updatedAt should remain the same when no actual changes
		expect(profile.updatedAt?.getTime()).toBe(originalProfile.updatedAt?.getTime())
	})

	it('updates displayName when it changes', async () => {
		// Arrange
		const userId = 'user_update_name'
		const email = 'updatename@example.com'

		await globalThis.testDb.insert(userProfiles).values({
			clerkId: userId,
			email,
			displayName: 'Old Name',
			userType: 'learner',
		})

		const request = createMockWebhookRequest('user.updated', {
			id: userId,
			email_addresses: [{ id: 'email_1', email_address: email }],
			primary_email_address_id: 'email_1',
			first_name: 'New',
			last_name: 'Name',
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(200)

		const [profile] = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, userId))
			.limit(1)

		expect(profile.displayName).toBe('New Name')
	})
})

/**
 * ## user.deleted event - Integration Tests
 */
describe('user.deleted event - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('deletes user profile', async () => {
		// Arrange
		const userId = 'user_to_delete'
		const email = 'delete@example.com'

		await globalThis.testDb.insert(userProfiles).values({
			clerkId: userId,
			email,
			userType: 'learner',
		})

		const request = createMockWebhookRequest('user.deleted', {
			id: userId,
			email_addresses: [{ id: 'email_1', email_address: email }],
			primary_email_address_id: 'email_1',
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(200)

		const profiles = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, userId))

		expect(profiles.length).toBe(0)
	})

	it('succeeds even when profile does not exist', async () => {
		// Arrange
		const userId = 'user_nonexistent'

		const request = createMockWebhookRequest('user.deleted', {
			id: userId,
			email_addresses: [{ id: 'email_1', email_address: 'nonexistent@example.com' }],
			primary_email_address_id: 'email_1',
		})

		// Act
		const response = await handleClerkWebhook(request)

		// Assert
		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body).toEqual({ received: true })
	})
})
