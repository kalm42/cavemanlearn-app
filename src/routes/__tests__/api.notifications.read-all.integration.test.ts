import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyToken } from '@clerk/backend'
import { eq } from 'drizzle-orm'

import { handleMarkAllNotificationsRead } from '../api.notifications.read-all'
import { notifications, userProfiles } from '@/db/schema.ts'
import { createMockAuthHeader } from '@/test/utils/clerk'

// Automatically uses __mocks__/@clerk/backend.ts
vi.mock('@clerk/backend')

const mockVerifyToken = vi.mocked(verifyToken)

/**
 * ## PUT /api/notifications/read-all - Integration
 *
 * Integration tests for marking all notifications as read.
 */
describe('PUT /api/notifications/read-all - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request('http://localhost/api/notifications/read-all', {
			method: 'PUT',
		})

		// Act
		const response = await handleMarkAllNotificationsRead(request)

		// Assert
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'UNAUTHORIZED' } })
	})

	it('returns 404 when user profile does not exist', async () => {
		// Arrange
		const authHeader = createMockAuthHeader(
			mockVerifyToken,
			'user_no_profile_read_all',
			'noprofile-read-all@example.com',
		)
		const request = new Request('http://localhost/api/notifications/read-all', {
			method: 'PUT',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleMarkAllNotificationsRead(request)

		// Assert
		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'PROFILE_NOT_FOUND' } })
	})

	it('marks all unread notifications as read', async () => {
		// Arrange
		const clerkId = 'user_read_all_success'
		const email = 'read-all-success@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		// Create mix of read and unread notifications
		await globalThis.testDb.insert(notifications).values([
			{
				userId: user.id,
				type: 'question_submitted_for_review',
				title: 'Unread 1',
				message: 'This is unread',
				read: false,
			},
			{
				userId: user.id,
				type: 'question_comment_added',
				title: 'Unread 2',
				message: 'This is also unread',
				read: false,
			},
			{
				userId: user.id,
				type: 'question_approved',
				title: 'Already Read',
				message: 'This was already read',
				read: true,
			},
		])

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/notifications/read-all', {
			method: 'PUT',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleMarkAllNotificationsRead(request)

		// Assert
		expect(response.status).toBe(200)
		const body: { updatedCount: number } = await response.json()
		expect(body.updatedCount).toBe(2)

		// Verify all notifications are now read
		const userNotifications = await globalThis.testDb
			.select()
			.from(notifications)
			.where(eq(notifications.userId, user.id))

		expect(userNotifications).toHaveLength(3)
		expect(userNotifications.every((n) => n.read)).toBe(true)
	})

	it('returns count of updated notifications', async () => {
		// Arrange
		const clerkId = 'user_read_all_count'
		const email = 'read-all-count@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		// Create 5 unread notifications
		const notificationValues = Array.from({ length: 5 }, (_, i) => ({
			userId: user.id,
			type: 'question_submitted_for_review' as const,
			title: `Notification ${String(i + 1)}`,
			message: `Message ${String(i + 1)}`,
			read: false,
		}))
		await globalThis.testDb.insert(notifications).values(notificationValues)

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/notifications/read-all', {
			method: 'PUT',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleMarkAllNotificationsRead(request)

		// Assert
		expect(response.status).toBe(200)
		const body: { updatedCount: number } = await response.json()
		expect(body.updatedCount).toBe(5)
	})

	it('returns 0 when no unread notifications', async () => {
		// Arrange
		const clerkId = 'user_read_all_none'
		const email = 'read-all-none@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		// Create only read notifications
		await globalThis.testDb.insert(notifications).values([
			{
				userId: user.id,
				type: 'question_submitted_for_review',
				title: 'Already Read 1',
				message: 'Already read',
				read: true,
			},
			{
				userId: user.id,
				type: 'question_comment_added',
				title: 'Already Read 2',
				message: 'Also already read',
				read: true,
			},
		])

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/notifications/read-all', {
			method: 'PUT',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleMarkAllNotificationsRead(request)

		// Assert
		expect(response.status).toBe(200)
		const body: { updatedCount: number } = await response.json()
		expect(body.updatedCount).toBe(0)
	})

	it('only marks current user notifications as read', async () => {
		// Arrange
		const clerkId1 = 'user_read_all_isolation_1'
		const email1 = 'isolation1-read-all@example.com'
		const clerkId2 = 'user_read_all_isolation_2'
		const email2 = 'isolation2-read-all@example.com'

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

		// Create unread notifications for both users
		await globalThis.testDb.insert(notifications).values([
			{
				userId: user1.id,
				type: 'question_submitted_for_review',
				title: 'User 1 Notification',
				message: 'Belongs to user 1',
				read: false,
			},
			{
				userId: user2.id,
				type: 'question_comment_added',
				title: 'User 2 Notification',
				message: 'Belongs to user 2',
				read: false,
			},
		])

		// User 1 marks all as read
		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId1, email1)
		const request = new Request('http://localhost/api/notifications/read-all', {
			method: 'PUT',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleMarkAllNotificationsRead(request)

		// Assert
		expect(response.status).toBe(200)
		const body: { updatedCount: number } = await response.json()
		expect(body.updatedCount).toBe(1)

		// Verify user 2's notification is still unread
		const user2Notifications = await globalThis.testDb
			.select()
			.from(notifications)
			.where(eq(notifications.userId, user2.id))

		expect(user2Notifications).toHaveLength(1)
		expect(user2Notifications[0].read).toBe(false)
	})
})
