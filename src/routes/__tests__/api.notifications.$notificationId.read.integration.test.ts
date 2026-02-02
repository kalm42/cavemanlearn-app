import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyToken } from '@clerk/backend'

import { handleMarkNotificationRead } from '../api.notifications.$notificationId.read'
import { notifications, userProfiles } from '@/db/schema.ts'
import { createMockAuthHeader } from '@/test/utils/clerk'

// Automatically uses __mocks__/@clerk/backend.ts
vi.mock('@clerk/backend')

const mockVerifyToken = vi.mocked(verifyToken)

// Valid UUID for tests that need to pass UUID validation (RFC 4122 compliant)
const VALID_TEST_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

/**
 * ## PUT /api/notifications/:notificationId/read - Integration
 *
 * Integration tests for marking a single notification as read.
 */
describe('PUT /api/notifications/:notificationId/read - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 400 for invalid UUID', async () => {
		// Arrange
		const request = new Request('http://localhost/api/notifications/not-a-valid-uuid/read', {
			method: 'PUT',
		})

		// Act
		const response = await handleMarkNotificationRead(request, 'not-a-valid-uuid')

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'INVALID_UUID' } })
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request(`http://localhost/api/notifications/${VALID_TEST_UUID}/read`, {
			method: 'PUT',
		})

		// Act
		const response = await handleMarkNotificationRead(request, VALID_TEST_UUID)

		// Assert
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'UNAUTHORIZED' } })
	})

	it('returns 404 when user profile does not exist', async () => {
		// Arrange
		const authHeader = createMockAuthHeader(
			mockVerifyToken,
			'user_no_profile_mark_read',
			'noprofile-mark-read@example.com',
		)
		const request = new Request(`http://localhost/api/notifications/${VALID_TEST_UUID}/read`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleMarkNotificationRead(request, VALID_TEST_UUID)

		// Assert
		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'PROFILE_NOT_FOUND' } })
	})

	it('returns 404 when notification does not exist', async () => {
		// Arrange
		const clerkId = 'user_notif_not_found'
		const email = 'notif-not-found@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const nonExistentId = '00000000-0000-0000-0000-000000000000'
		const request = new Request(`http://localhost/api/notifications/${nonExistentId}/read`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleMarkNotificationRead(request, nonExistentId)

		// Assert
		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'NOTIFICATION_NOT_FOUND' } })
	})

	it('returns 403 when notification belongs to another user', async () => {
		// Arrange
		const clerkId1 = 'user_mark_read_owner'
		const email1 = 'owner@example.com'
		const clerkId2 = 'user_mark_read_other'
		const email2 = 'other@example.com'

		const [owner] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: clerkId1,
				email: email1,
				userType: 'publisher',
			})
			.returning()

		await globalThis.testDb.insert(userProfiles).values({
			clerkId: clerkId2,
			email: email2,
			userType: 'publisher',
		})

		// Create notification for owner
		const [notification] = await globalThis.testDb
			.insert(notifications)
			.values({
				userId: owner.id,
				type: 'question_submitted_for_review',
				title: 'Owner Notification',
				message: 'This belongs to owner',
				read: false,
			})
			.returning()

		// Other user tries to mark it as read
		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId2, email2)
		const request = new Request(`http://localhost/api/notifications/${notification.id}/read`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleMarkNotificationRead(request, notification.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'FORBIDDEN' } })
	})

	it('marks notification as read successfully', async () => {
		// Arrange
		const clerkId = 'user_mark_read_success'
		const email = 'mark-read-success@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [notification] = await globalThis.testDb
			.insert(notifications)
			.values({
				userId: user.id,
				type: 'question_submitted_for_review',
				title: 'To Be Read',
				message: 'This will be marked as read',
				read: false,
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/notifications/${notification.id}/read`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleMarkNotificationRead(request, notification.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { notification: { id: string; read: boolean; title: string } } =
			await response.json()
		expect(body.notification.id).toBe(notification.id)
		expect(body.notification.read).toBe(true)
		expect(body.notification.title).toBe('To Be Read')
	})

	it('is idempotent (succeeds even if already read)', async () => {
		// Arrange
		const clerkId = 'user_mark_read_idempotent'
		const email = 'mark-read-idempotent@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		// Create notification that is already read
		const [notification] = await globalThis.testDb
			.insert(notifications)
			.values({
				userId: user.id,
				type: 'question_submitted_for_review',
				title: 'Already Read',
				message: 'This is already read',
				read: true,
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/notifications/${notification.id}/read`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleMarkNotificationRead(request, notification.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { notification: { id: string; read: boolean } } = await response.json()
		expect(body.notification.id).toBe(notification.id)
		expect(body.notification.read).toBe(true)
	})
})
