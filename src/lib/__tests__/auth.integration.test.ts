import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyToken } from '@clerk/backend'
import { getCurrentUser, getUserProfile } from '../auth'
import type { UserProfile } from '@/db/schema'
import { userProfiles } from '@/db/schema'

// Automatically uses __mocks__/@clerk/backend.ts
vi.mock('@clerk/backend')

const mockVerifyToken = vi.mocked(verifyToken)

/**
 * ## getCurrentUser
 *
 * Integration test for the getCurrentUser function. Almost end2end, but not quite.
 */
describe('getCurrentUser', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns null when no Authorization header', async () => {
		const request = new Request('http://localhost/api/test')

		const result = await getCurrentUser(request)

		expect(result).toBeNull()
	})

	it('returns null when Authorization header is not Bearer', async () => {
		const request = new Request('http://localhost/api/test', {
			headers: { Authorization: 'Basic abc123' },
		})

		const result = await getCurrentUser(request)

		expect(result).toBeNull()
	})

	it('returns null when token is empty', async () => {
		const request = new Request('http://localhost/api/test', {
			headers: { Authorization: 'Bearer ' },
		})

		const result = await getCurrentUser(request)

		expect(result).toBeNull()
	})

	it('returns null when CLERK_SECRET_KEY is not set', async () => {
		const request = new Request('http://localhost/api/test', {
			headers: { Authorization: 'Bearer valid-token' },
		})

		const result = await getCurrentUser(request)

		expect(result).toBeNull()
	})

	it('returns null when verifyToken throws', async () => {
		mockVerifyToken.mockRejectedValueOnce(new Error('Invalid token'))
		const request = new Request('http://localhost/api/test', {
			headers: { Authorization: 'Bearer invalid-token' },
		})

		const result = await getCurrentUser(request)

		expect(result).toBeNull()
	})

	it('returns null when payload has no userId', async () => {
		mockVerifyToken.mockResolvedValueOnce({
			sub: '',
			email: 'test@example.com',
		} as never)
		const request = new Request('http://localhost/api/test', {
			headers: { Authorization: 'Bearer valid-token' },
		})

		const result = await getCurrentUser(request)

		expect(result).toBeNull()
	})

	it('returns null when payload has no email', async () => {
		mockVerifyToken.mockResolvedValueOnce({
			sub: 'user_123',
			email: undefined,
		} as never)
		const request = new Request('http://localhost/api/test', {
			headers: { Authorization: 'Bearer valid-token' },
		})

		const result = await getCurrentUser(request)

		expect(result).toBeNull()
	})

	it('returns user when token is valid', async () => {
		mockVerifyToken.mockResolvedValueOnce({
			sub: 'user_123',
			email: 'test@example.com',
		} as never)
		const request = new Request('http://localhost/api/test', {
			headers: { Authorization: 'Bearer valid-token' },
		})

		const result = await getCurrentUser(request)

		expect(result).toEqual({
			userId: 'user_123',
			email: 'test@example.com',
		})
		expect(mockVerifyToken).toHaveBeenCalledWith('valid-token', {
			secretKey: expect.any(String),
		})
	})
})

describe('getUserProfile', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns null when profile does not exist', async () => {
		// No user inserted into the database, so we expect null

		const result = await getUserProfile('user_123')

		expect(result).toBeNull()
	})

	it('returns profile when it exists', async () => {
		const fakeProfile: UserProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_123',
			email: 'test@example.com',
			displayName: null,
			avatarUrl: null,
			userType: 'learner',
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		await globalThis.testDb.insert(userProfiles).values(fakeProfile)

		const result = await getUserProfile('user_123')

		expect(result).toEqual(fakeProfile)
	})
})
