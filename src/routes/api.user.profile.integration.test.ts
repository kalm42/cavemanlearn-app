import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyToken } from '@clerk/backend'
import { eq } from 'drizzle-orm'

import { handleCreateProfile, handleGetProfile } from './api.user.profile'
import type { NewUserProfile } from '@/db/schema.ts'
import { userProfiles } from '@/db/schema.ts'
import { createMockAuthHeader } from '@/test/utils/clerk'

// Automatically uses __mocks__/@clerk/backend.ts
vi.mock('@clerk/backend')

const mockVerifyToken = vi.mocked(verifyToken)

/**
 * ## GET /api/user/profile - Integration
 *
 * Integration test for the GET /api/user/profile endpoint.
 */
describe('GET /api/user/profile - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
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
		// Arrange
		const newProfile: NewUserProfile = {
			clerkId: 'user_existing',
			email: 'existing@example.com',
			userType: 'learner',
		}
		const [createdProfile] = await globalThis.testDb
			.insert(userProfiles)
			.values(newProfile)
			.returning()

		const authHeader = createMockAuthHeader(
			mockVerifyToken,
			'user_existing',
			'existing@example.com',
		)
		const request = new Request('http://localhost/api/user/profile', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetProfile(request)

		// Assert
		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.id).toBe(createdProfile.id)
		expect(body.clerkId).toBe(newProfile.clerkId)
		expect(body.email).toBe(newProfile.email)
		expect(body.userType).toBe(newProfile.userType)
	})
})

/**
 * ## POST /api/user/profile - Integration
 *
 * Integration test for the POST /api/user/profile endpoint.
 */
describe('POST /api/user/profile - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
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
		// Arrange
		const userName = 'user_new'
		const email = 'new@example.com'
		const userType = 'learner'
		const authHeader = createMockAuthHeader(mockVerifyToken, userName, email)
		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ userType }),
		})

		const response = await handleCreateProfile(request)

		expect(response.status).toBe(201)
		const body = await response.json()
		expect(body.clerkId).toBe(userName)
		expect(body.email).toBe(email)
		expect(body.userType).toBe(userType)

		// Verify the profile was actually created in the database
		const [profile] = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, userName))
			.limit(1)

		expect(profile).toBeTruthy()
		expect(profile.clerkId).toBe(userName)
		expect(profile.email).toBe(email)
		expect(profile.userType).toBe(userType)
	})

	it('creates profile with publisher type', async () => {
		// Arrange
		const userName = 'user_publisher'
		const email = 'publisher@example.com'
		const userType = 'publisher'
		const authHeader = createMockAuthHeader(mockVerifyToken, userName, email)
		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ userType }),
		})

		const response = await handleCreateProfile(request)

		expect(response.status).toBe(201)
		const body = await response.json()
		expect(body.userType).toBe(userType)

		// Verify the profile was created with publisher type
		const [profile] = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, userName))
			.limit(1)

		expect(profile).toBeTruthy()
		expect(profile.clerkId).toBe(userName)
		expect(profile.email).toBe(email)
		expect(profile.userType).toBe(userType)
	})

	it('returns 409 when profile already exists', async () => {
		// Arrange
		const userName = 'user_duplicate'
		const email = 'duplicate@example.com'
		const userType = 'learner'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId: userName,
			email,
			userType,
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, userName, email)
		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ userType }),
		})

		const response = await handleCreateProfile(request)

		expect(response.status).toBe(409)
		const body = await response.json()
		expect(body).toEqual({ error: 'Profile already exists' })
	})

	it('handles duplicate clerkId constraint violation', async () => {
		// Arrange
		const userName = 'user_constraint'
		const email = 'first@example.com'
		const secondEmail = 'second@example.com'
		const userType = 'learner'

		await globalThis.testDb.insert(userProfiles).values({
			clerkId: userName,
			email,
			userType,
		})

		// Try to create another profile with the same clerkId
		// This should be caught by the duplicate check before hitting the database constraint
		const authHeader = createMockAuthHeader(
			mockVerifyToken,
			userName, // not unique clerk id
			secondEmail, // unique email address
		)
		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ userType }),
		})

		// Act
		const response = await handleCreateProfile(request)

		// Assert
		expect(response.status).toBe(409)
		const body = await response.json()
		expect(body).toEqual({ error: 'Profile already exists' })
	})
})
