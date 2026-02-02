import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '@/db/index.ts'
import { notifications } from '@/db/schema.ts'
import { notificationSchema } from '@/db/validators.ts'
import { captureServerException } from '@/integrations/posthog/server.ts'
import { getCurrentUser, getUserProfile } from '@/lib/auth.ts'
import { validateUuid } from '@/lib/validation/common.ts'

/**
 * ## handleMarkNotificationRead
 *
 * Handles PUT requests to mark a single notification as read. Validates that the
 * notification exists and belongs to the authenticated user. Returns 400 if UUID
 * is invalid, 401 if unauthenticated, 404 if profile or notification doesn't exist,
 * 403 if notification belongs to another user, or 200 with the updated notification.
 *
 * @example
 * const response = await handleMarkNotificationRead(request, 'notification-uuid')
 * const { notification } = await response.json()
 */
export async function handleMarkNotificationRead(
	request: Request,
	notificationId: string,
): Promise<Response> {
	const validationError = validateUuid(notificationId)
	if (validationError) return validationError

	const user = await getCurrentUser(request)
	if (!user) {
		return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
	}

	const profile = await getUserProfile(user.userId)
	if (!profile) {
		return Response.json({ error: { code: 'PROFILE_NOT_FOUND' } }, { status: 404 })
	}

	try {
		// Get the notification
		const notificationResults = await db
			.select()
			.from(notifications)
			.where(eq(notifications.id, notificationId))
			.limit(1)

		const notification = notificationResults.at(0)
		if (!notification) {
			return Response.json({ error: { code: 'NOTIFICATION_NOT_FOUND' } }, { status: 404 })
		}

		// Verify ownership
		if (notification.userId !== profile.id) {
			return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
		}

		// Update notification to read
		const [updatedNotification] = await db
			.update(notifications)
			.set({ read: true })
			.where(eq(notifications.id, notificationId))
			.returning()

		const validatedNotification = notificationSchema.parse(updatedNotification)

		return Response.json({ notification: validatedNotification })
	} catch (error) {
		captureServerException(error, {
			context: 'handleMarkNotificationRead',
			userId: profile.id,
			notificationId,
		})
		return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
	}
}

export const Route = createFileRoute('/api/notifications/$notificationId/read')({
	server: {
		handlers: {
			PUT: ({ request, params }) => handleMarkNotificationRead(request, params.notificationId),
		},
	},
})
