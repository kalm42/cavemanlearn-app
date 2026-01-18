import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyToken } from '@clerk/backend'
import { getCurrentUser, getUserProfile } from './auth'

import { db } from '@/db/index.ts'

// Automatically uses __mocks__/@clerk/backend.ts
vi.mock('@clerk/backend')

vi.mock('@/db/index.ts', () => ({
	db: {
		select: vi.fn(),
	},
}))

vi.mock('@/db/schema.ts', () => ({
	userProfiles: { clerkId: 'clerk_id' },
}))

const mockVerifyToken = vi.mocked(verifyToken)
const mockDb = vi.mocked(db)

describe('getCurrentUser', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubEnv('CLERK_SECRET_KEY', 'test-secret-key')
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
		vi.stubEnv('CLERK_SECRET_KEY', '')
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
		const mockFrom = vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				limit: vi.fn().mockResolvedValue([]),
			}),
		})
		mockDb.select.mockReturnValue({ from: mockFrom } as never)

		const result = await getUserProfile('user_123')

		expect(result).toBeNull()
	})

	it('returns profile when it exists', async () => {
		const mockProfile = {
			id: 'profile-uuid',
			clerkId: 'user_123',
			email: 'test@example.com',
			displayName: null,
			avatarUrl: null,
			userType: 'learner',
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		const mockFrom = vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				limit: vi.fn().mockResolvedValue([mockProfile]),
			}),
		})
		mockDb.select.mockReturnValue({ from: mockFrom } as never)

		const result = await getUserProfile('user_123')

		expect(result).toEqual(mockProfile)
	})
})
