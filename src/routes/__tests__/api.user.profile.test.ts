import { beforeEach, describe, expect, it, vi } from 'vitest'

import { handleCreateProfile, handleGetProfile, handleUpdateProfile } from '../api.user.profile'
import { db } from '@/db/index.ts'
import { getCurrentUser, getUserProfile } from '@/lib/auth'

vi.mock('@/lib/auth')

// Mock database - external dependency
vi.mock('@/db/index.ts', () => ({
	db: {
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
	},
}))

vi.mock('@/db/schema.ts', async (importOriginal) => {
	const actual = await importOriginal()
	return {
		...(actual as object),
		userProfiles: { clerkId: 'clerk_id' },
	}
})

const mockDb = vi.mocked(db)
const mockGetCurrentUser = vi.mocked(getCurrentUser)
const mockGetUserProfile = vi.mocked(getUserProfile)

const mockProfile = {
	id: '550e8400-e29b-41d4-a716-446655440000',
	clerkId: 'user_123',
	email: 'test@example.com',
	displayName: null,
	avatarUrl: null,
	userType: 'learner' as const,
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01'),
}

describe('GET /api/user/profile', () => {
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
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })

		const request = new Request('http://localhost/api/user/profile', {
			headers: { Authorization: 'Bearer valid-token' },
		})

		const response = await handleGetProfile(request)

		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: 'Profile not found' })
	})

	it('returns profile when it exists', async () => {
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })
		mockGetUserProfile.mockResolvedValueOnce(mockProfile)

		const request = new Request('http://localhost/api/user/profile', {
			headers: { Authorization: 'Bearer valid-token' },
		})

		const response = await handleGetProfile(request)

		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.id).toBe('550e8400-e29b-41d4-a716-446655440000')
		expect(body.clerkId).toBe('user_123')
		expect(body.email).toBe('test@example.com')
		expect(body.userType).toBe('learner')
	})
})

describe('POST /api/user/profile', () => {
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

	it('returns 400 when userType is missing', async () => {
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })

		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({}),
		})

		const response = await handleCreateProfile(request)

		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: 'Invalid userType. Must be "learner" or "publisher"' })
	})

	it('returns 400 when userType is invalid', async () => {
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })

		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({ userType: 'admin' }),
		})

		const response = await handleCreateProfile(request)

		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: 'Invalid userType. Must be "learner" or "publisher"' })
	})

	it('returns 409 when profile already exists', async () => {
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })
		mockGetUserProfile.mockResolvedValueOnce(mockProfile)

		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({ userType: 'learner' }),
		})

		const response = await handleCreateProfile(request)

		expect(response.status).toBe(409)
		const body = await response.json()
		expect(body).toEqual({ error: 'Profile already exists' })
	})

	it('creates profile successfully with learner type', async () => {
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })
		mockGetUserProfile.mockResolvedValueOnce(null)
		// Mock database insert to return the created profile
		const mockValues = vi.fn().mockReturnValue({
			returning: vi.fn().mockResolvedValue([mockProfile]),
		})
		mockDb.insert.mockReturnValue({ values: mockValues } as never)

		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({ userType: 'learner' }),
		})

		const response = await handleCreateProfile(request)

		expect(response.status).toBe(201)
		const body = await response.json()
		expect(body.clerkId).toBe('user_123')
		expect(body.email).toBe('test@example.com')
		expect(body.userType).toBe('learner')
	})

	it('creates profile successfully with publisher type', async () => {
		const publisherProfile = { ...mockProfile, userType: 'publisher' as const }
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })
		mockGetUserProfile.mockResolvedValueOnce(null)
		// Mock database insert to return the created profile
		const mockValues = vi.fn().mockReturnValue({
			returning: vi.fn().mockResolvedValue([publisherProfile]),
		})
		mockDb.insert.mockReturnValue({ values: mockValues } as never)

		const request = new Request('http://localhost/api/user/profile', {
			method: 'POST',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({ userType: 'publisher' }),
		})

		const response = await handleCreateProfile(request)

		expect(response.status).toBe(201)
		const body = await response.json()
		expect(body.userType).toBe('publisher')
	})
})

describe('PUT /api/user/profile', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.stubEnv('CLERK_SECRET_KEY', 'test-secret-key')
	})

	it('returns 401 when not authenticated', async () => {
		const request = new Request('http://localhost/api/user/profile', {
			method: 'PUT',
			body: JSON.stringify({ displayName: 'New Name' }),
		})

		const response = await handleUpdateProfile(request)

		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: 'Unauthorized' })
	})

	it('returns 400 when no fields are provided', async () => {
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })

		const request = new Request('http://localhost/api/user/profile', {
			method: 'PUT',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({}),
		})

		const response = await handleUpdateProfile(request)

		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body.error).toBe('At least one field (displayName or avatarUrl) must be provided')
	})

	it('returns 400 when displayName is empty string', async () => {
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })

		const request = new Request('http://localhost/api/user/profile', {
			method: 'PUT',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({ displayName: '' }),
		})

		const response = await handleUpdateProfile(request)

		expect(response.status).toBe(400)
	})

	it('returns 400 when avatarUrl is invalid URL', async () => {
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })

		const request = new Request('http://localhost/api/user/profile', {
			method: 'PUT',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({ avatarUrl: 'not-a-url' }),
		})

		const response = await handleUpdateProfile(request)

		expect(response.status).toBe(400)
	})

	it('returns 404 when profile does not exist', async () => {
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })
		mockGetUserProfile.mockResolvedValueOnce(null)

		const request = new Request('http://localhost/api/user/profile', {
			method: 'PUT',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({ displayName: 'New Name' }),
		})

		const response = await handleUpdateProfile(request)

		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: 'Profile not found' })
	})

	it('updates displayName successfully', async () => {
		const updatedProfile = { ...mockProfile, displayName: 'New Name' }
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })
		mockGetUserProfile.mockResolvedValueOnce(mockProfile)
		// Mock database update
		const mockSet = vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([updatedProfile]),
			}),
		})
		mockDb.update.mockReturnValue({ set: mockSet } as never)

		const request = new Request('http://localhost/api/user/profile', {
			method: 'PUT',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({ displayName: 'New Name' }),
		})

		const response = await handleUpdateProfile(request)

		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.displayName).toBe('New Name')
	})

	it('updates avatarUrl successfully', async () => {
		const updatedProfile = { ...mockProfile, avatarUrl: 'https://example.com/avatar.png' }
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })
		mockGetUserProfile.mockResolvedValueOnce(mockProfile)
		// Mock database update
		const mockSet = vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([updatedProfile]),
			}),
		})
		mockDb.update.mockReturnValue({ set: mockSet } as never)

		const request = new Request('http://localhost/api/user/profile', {
			method: 'PUT',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({ avatarUrl: 'https://example.com/avatar.png' }),
		})

		const response = await handleUpdateProfile(request)

		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.avatarUrl).toBe('https://example.com/avatar.png')
	})

	it('updates both displayName and avatarUrl successfully', async () => {
		const updatedProfile = {
			...mockProfile,
			displayName: 'New Name',
			avatarUrl: 'https://example.com/avatar.png',
		}
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })
		mockGetUserProfile.mockResolvedValueOnce(mockProfile)
		// Mock database update
		const mockSet = vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([updatedProfile]),
			}),
		})
		mockDb.update.mockReturnValue({ set: mockSet } as never)

		const request = new Request('http://localhost/api/user/profile', {
			method: 'PUT',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({
				displayName: 'New Name',
				avatarUrl: 'https://example.com/avatar.png',
			}),
		})

		const response = await handleUpdateProfile(request)

		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.displayName).toBe('New Name')
		expect(body.avatarUrl).toBe('https://example.com/avatar.png')
	})

	it('allows setting displayName to null', async () => {
		const updatedProfile = { ...mockProfile, displayName: null }
		mockGetCurrentUser.mockResolvedValueOnce({ userId: 'user_123', email: 'test@example.com' })
		mockGetUserProfile.mockResolvedValueOnce({ ...mockProfile, displayName: 'Old Name' })
		// Mock database update
		const mockSet = vi.fn().mockReturnValue({
			where: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([updatedProfile]),
			}),
		})
		mockDb.update.mockReturnValue({ set: mockSet } as never)

		const request = new Request('http://localhost/api/user/profile', {
			method: 'PUT',
			headers: { Authorization: 'Bearer valid-token' },
			body: JSON.stringify({ displayName: null }),
		})

		const response = await handleUpdateProfile(request)

		expect(response.status).toBe(200)
		const body = await response.json()
		expect(body.displayName).toBeNull()
	})
})
