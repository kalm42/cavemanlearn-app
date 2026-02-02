import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyToken } from '@clerk/backend'

import { handleGetNotifications } from '../api.notifications'
import { notifications, userProfiles } from '@/db/schema.ts'
import { createMockAuthHeader } from '@/test/utils/clerk'

// Automatically uses __mocks__/@clerk/backend.ts
vi.mock('@clerk/backend')

const mockVerifyToken = vi.mocked(verifyToken)

/**
 * ## GET /api/notifications - Integration
 *
 * Integration tests for the GET /api/notifications endpoint.
 */
describe('GET /api/notifications - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request('http://localhost/api/notifications')

		// Act
		const response = await handleGetNotifications(request)

		// Assert
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'UNAUTHORIZED' } })
	})

	it('returns 404 when user profile does not exist', async () => {
		// Arrange
		const authHeader = createMockAuthHeader(
			mockVerifyToken,
			'user_no_profile_notif',
			'noprofile@example.com',
		)
		const request = new Request('http://localhost/api/notifications', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetNotifications(request)

		// Assert
		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'PROFILE_NOT_FOUND' } })
	})

	it('returns empty array for user with no notifications', async () => {
		// Arrange
		const clerkId = 'user_no_notifications'
		const email = 'no-notifications@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/notifications', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetNotifications(request)

		// Assert
		expect(response.status).toBe(200)
		const body: {
			notifications: Array<unknown>
			pagination: { hasMore: boolean; nextCursor: null }
		} = await response.json()
		expect(body.notifications).toEqual([])
		expect(body.pagination.hasMore).toBe(false)
		expect(body.pagination.nextCursor).toBeNull()
	})

	it('returns notifications ordered by createdAt DESC', async () => {
		// Arrange
		const clerkId = 'user_ordered_notifications'
		const email = 'ordered-notifications@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		// Create notifications with different timestamps
		const now = new Date()
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
		const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

		await globalThis.testDb.insert(notifications).values([
			{
				userId: user.id,
				type: 'question_submitted_for_review',
				title: 'Oldest',
				message: 'Oldest notification',
				createdAt: twoHoursAgo,
			},
			{
				userId: user.id,
				type: 'question_comment_added',
				title: 'Middle',
				message: 'Middle notification',
				createdAt: oneHourAgo,
			},
			{
				userId: user.id,
				type: 'question_approved',
				title: 'Newest',
				message: 'Newest notification',
				createdAt: now,
			},
		])

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/notifications', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetNotifications(request)

		// Assert
		expect(response.status).toBe(200)
		const body: { notifications: Array<{ title: string }> } = await response.json()
		expect(body.notifications).toHaveLength(3)
		expect(body.notifications[0].title).toBe('Newest')
		expect(body.notifications[1].title).toBe('Middle')
		expect(body.notifications[2].title).toBe('Oldest')
	})

	it('filters by read=true (only read notifications)', async () => {
		// Arrange
		const clerkId = 'user_filter_read_true'
		const email = 'filter-read-true@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		await globalThis.testDb.insert(notifications).values([
			{
				userId: user.id,
				type: 'question_submitted_for_review',
				title: 'Read notification',
				message: 'This is read',
				read: true,
			},
			{
				userId: user.id,
				type: 'question_comment_added',
				title: 'Unread notification',
				message: 'This is unread',
				read: false,
			},
		])

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/notifications?read=true', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetNotifications(request)

		// Assert
		expect(response.status).toBe(200)
		const body: { notifications: Array<{ title: string; read: boolean }> } = await response.json()
		expect(body.notifications).toHaveLength(1)
		expect(body.notifications[0].title).toBe('Read notification')
		expect(body.notifications[0].read).toBe(true)
	})

	it('filters by read=false (only unread notifications)', async () => {
		// Arrange
		const clerkId = 'user_filter_read_false'
		const email = 'filter-read-false@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		await globalThis.testDb.insert(notifications).values([
			{
				userId: user.id,
				type: 'question_submitted_for_review',
				title: 'Read notification',
				message: 'This is read',
				read: true,
			},
			{
				userId: user.id,
				type: 'question_comment_added',
				title: 'Unread notification',
				message: 'This is unread',
				read: false,
			},
		])

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/notifications?read=false', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetNotifications(request)

		// Assert
		expect(response.status).toBe(200)
		const body: { notifications: Array<{ title: string; read: boolean }> } = await response.json()
		expect(body.notifications).toHaveLength(1)
		expect(body.notifications[0].title).toBe('Unread notification')
		expect(body.notifications[0].read).toBe(false)
	})

	it('respects limit parameter', async () => {
		// Arrange
		const clerkId = 'user_limit_param'
		const email = 'limit-param@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		// Create 5 notifications
		const notificationValues = Array.from({ length: 5 }, (_, i) => ({
			userId: user.id,
			type: 'question_submitted_for_review' as const,
			title: `Notification ${String(i + 1)}`,
			message: `Message ${String(i + 1)}`,
		}))
		await globalThis.testDb.insert(notifications).values(notificationValues)

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/notifications?limit=2', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetNotifications(request)

		// Assert
		expect(response.status).toBe(200)
		const body: { notifications: Array<unknown>; pagination: { hasMore: boolean } } =
			await response.json()
		expect(body.notifications).toHaveLength(2)
		expect(body.pagination.hasMore).toBe(true)
	})

	it('returns nextCursor when more results exist', async () => {
		// Arrange
		const clerkId = 'user_next_cursor'
		const email = 'next-cursor@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		// Create 3 notifications
		const now = new Date()
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
		const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

		await globalThis.testDb.insert(notifications).values([
			{
				userId: user.id,
				type: 'question_submitted_for_review',
				title: 'Oldest',
				message: 'Oldest',
				createdAt: twoHoursAgo,
			},
			{
				userId: user.id,
				type: 'question_comment_added',
				title: 'Middle',
				message: 'Middle',
				createdAt: oneHourAgo,
			},
			{
				userId: user.id,
				type: 'question_approved',
				title: 'Newest',
				message: 'Newest',
				createdAt: now,
			},
		])

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/notifications?limit=2', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetNotifications(request)

		// Assert
		expect(response.status).toBe(200)
		const body: {
			notifications: Array<unknown>
			pagination: { hasMore: boolean; nextCursor: string }
		} = await response.json()
		expect(body.notifications).toHaveLength(2)
		expect(body.pagination.hasMore).toBe(true)
		expect(body.pagination.nextCursor).toBeTruthy()
	})

	it('cursor fetches next page correctly', async () => {
		// Arrange
		const clerkId = 'user_cursor_paging'
		const email = 'cursor-paging@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		// Create 3 notifications with distinct timestamps
		const now = new Date()
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
		const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

		await globalThis.testDb.insert(notifications).values([
			{
				userId: user.id,
				type: 'question_submitted_for_review',
				title: 'Page 2',
				message: 'Should be on page 2',
				createdAt: twoHoursAgo,
			},
			{
				userId: user.id,
				type: 'question_comment_added',
				title: 'Page 1 - Second',
				message: 'Page 1 second item',
				createdAt: oneHourAgo,
			},
			{
				userId: user.id,
				type: 'question_approved',
				title: 'Page 1 - First',
				message: 'Page 1 first item',
				createdAt: now,
			},
		])

		// First request - get page 1
		const authHeader1 = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request1 = new Request('http://localhost/api/notifications?limit=2', {
			headers: { Authorization: authHeader1 },
		})
		const response1 = await handleGetNotifications(request1)
		const body1: {
			notifications: Array<{ title: string }>
			pagination: { nextCursor: string }
		} = await response1.json()

		expect(body1.notifications).toHaveLength(2)
		expect(body1.notifications[0].title).toBe('Page 1 - First')
		expect(body1.notifications[1].title).toBe('Page 1 - Second')

		// Second request - use cursor to get page 2
		const authHeader2 = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request2 = new Request(
			`http://localhost/api/notifications?limit=2&cursor=${encodeURIComponent(body1.pagination.nextCursor)}`,
			{
				headers: { Authorization: authHeader2 },
			},
		)
		const response2 = await handleGetNotifications(request2)
		const body2: {
			notifications: Array<{ title: string }>
			pagination: { hasMore: boolean; nextCursor: string | null }
		} = await response2.json()

		// Assert
		expect(body2.notifications).toHaveLength(1)
		expect(body2.notifications[0].title).toBe('Page 2')
		expect(body2.pagination.hasMore).toBe(false)
		expect(body2.pagination.nextCursor).toBeNull()
	})

	it('does not return other users notifications', async () => {
		// Arrange
		const clerkId1 = 'user_isolation_1'
		const email1 = 'isolation1@example.com'
		const clerkId2 = 'user_isolation_2'
		const email2 = 'isolation2@example.com'

		const [user1] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: clerkId1,
				email: email1,
				userType: 'publisher',
			})
			.returning()

		const [user2] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: clerkId2,
				email: email2,
				userType: 'publisher',
			})
			.returning()

		// Create notifications for both users
		await globalThis.testDb.insert(notifications).values([
			{
				userId: user1.id,
				type: 'question_submitted_for_review',
				title: 'User 1 Notification',
				message: 'Belongs to user 1',
			},
			{
				userId: user2.id,
				type: 'question_comment_added',
				title: 'User 2 Notification',
				message: 'Belongs to user 2',
			},
		])

		// User 1 requests their notifications
		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId1, email1)
		const request = new Request('http://localhost/api/notifications', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetNotifications(request)

		// Assert
		expect(response.status).toBe(200)
		const body: { notifications: Array<{ title: string }> } = await response.json()
		expect(body.notifications).toHaveLength(1)
		expect(body.notifications[0].title).toBe('User 1 Notification')
	})

	it('returns 400 for invalid query parameters', async () => {
		// Arrange
		const clerkId = 'user_invalid_query'
		const email = 'invalid-query@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/notifications?limit=0', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetNotifications(request)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'VALIDATION_ERROR' } })
	})
})
