import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyToken } from '@clerk/backend'
import { eq } from 'drizzle-orm'

import { handleCreateProfile, handleGetProfile } from './api.user.profile'
import { userProfiles } from '@/db/schema.ts'
import { createMockAuthHeader } from '@/test/utils/clerk'

// Automatically uses __mocks__/@clerk/backend.ts
vi.mock('@clerk/backend')

const mockVerifyToken = vi.mocked(verifyToken)

describe('GET /api/user/profile - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubEnv('CLERK_SECRET_KEY', 'test-secret-key')
	})

	it('returns 401 when not authenticated', async () => {
		const request = new Request('http://localhost/api/user/profile')

		const response = await handleGetProfile(request)

		expect(response.status).toBe(401)
		const body: { error: string } = await response.json()
		expect(body).toEqual({ error: 'Unauthorized' })
	})

	it('returns 404 when profile does not exist', async () => {
		const authHeader = createMockAuthHeader(mockVerifyToken, 'user_nonexistent', 'test@example.com')
		const request = new Request('http://localhost/api/user/profile', {
			headers: { Authorization: authHeader },
		})

		const response = await handleGetProfile(request)

		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: 'Profile not found' })
	})

	it('returns profile when it exists', async () => {
		// Create a profile in the database
		const [createdProfile] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_existing',
				email: 'existing@example.com',
				userType: 'learner',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, 'user_existing', 'existing@example.com')
		const request = new Request('http://localhost/api/user/profile', {
			headers: { Authorization: authHeader },
		})

		const response = await handleGetProfile(request)

		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.id).toBe(createdProfile.id)
		expect(body.clerkId).toBe('user_existing')
		expect(body.email).toBe('existing@example.com')
		expect(body.userType).toBe('learner')
	})
})

describe('POST /api/user/profile - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubEnv('CLERK_SECRET_KEY', 'test-secret-key')
	})

	it('returns 401 when not authenticated', async () => {
		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			body: JSON.stringify({ userType: 'learner' }),
		})

		const response = await handleCreateProfile(request)

		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: 'Unauthorized' })
	})

	it('creates profile successfully and returns it', async () => {
		const authHeader = createMockAuthHeader(mockVerifyToken, 'user_new', 'new@example.com')
		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ userType: 'learner' }),
		})

		const response = await handleCreateProfile(request)

		expect(response.status).toBe(201)
		const body = await response.json()
		expect(body.clerkId).toBe('user_new')
		expect(body.email).toBe('new@example.com')
		expect(body.userType).toBe('learner')
		expect(body.id).toBeDefined()
		expect(body.createdAt).toBeDefined()

		// Verify the profile was actually created in the database
		const [profile] = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, 'user_new'))
			.limit(1)

		expect(profile).toBeDefined()
		expect(profile.clerkId).toBe('user_new')
		expect(profile.email).toBe('new@example.com')
		expect(profile.userType).toBe('learner')
	})

	it('creates profile with publisher type', async () => {
		const authHeader = createMockAuthHeader(mockVerifyToken, 'user_publisher', 'publisher@example.com')
		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ userType: 'publisher' }),
		})

		const response = await handleCreateProfile(request)

		expect(response.status).toBe(201)
		const body = await response.json()
		expect(body.userType).toBe('publisher')

		// Verify the profile was created with publisher type
		const [profile] = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, 'user_publisher'))
			.limit(1)

		expect(profile.userType).toBe('publisher')
	})

	it('returns 409 when profile already exists', async () => {
		// Create a profile first
		await globalThis.testDb.insert(userProfiles).values({
			clerkId: 'user_duplicate',
			email: 'duplicate@example.com',
			userType: 'learner',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, 'user_duplicate', 'duplicate@example.com')
		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ userType: 'learner' }),
		})

		const response = await handleCreateProfile(request)

		expect(response.status).toBe(409)
		const body = await response.json()
		expect(body).toEqual({ error: 'Profile already exists' })
	})

	it('handles duplicate clerkId constraint violation', async () => {
		// Create a profile with a specific clerkId
		await globalThis.testDb.insert(userProfiles).values({
			clerkId: 'user_constraint',
			email: 'first@example.com',
			userType: 'learner',
		})

		// Try to create another profile with the same clerkId
		// This should be caught by the duplicate check before hitting the database constraint
		const authHeader = createMockAuthHeader(mockVerifyToken, 'user_constraint', 'second@example.com')
		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ userType: 'publisher' }),
		})

		const response = await handleCreateProfile(request)

		// Should return 409 before hitting database constraint
		expect(response.status).toBe(409)
		const body = await response.json()
		expect(body).toEqual({ error: 'Profile already exists' })
	})
})
