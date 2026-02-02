import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db/index.ts'
import { notifications } from '@/db/schema.ts'
import { captureServerException } from '@/integrations/posthog/server.ts'
import { getCurrentUser, getUserProfile } from '@/lib/auth.ts'

/**
 * ## handleMarkAllNotificationsRead
 *
 * Handles PUT requests to mark all of a user's unread notifications as read.
 * Returns 401 if unauthenticated, 404 if user profile doesn't exist, or 200
 * with the count of updated notifications.
 *
 * @example
 * const response = await handleMarkAllNotificationsRead(request)
 * const { updatedCount } = await response.json()
 */
export async function handleMarkAllNotificationsRead(request: Request): Promise<Response> {
	const user = await getCurrentUser(request)
	if (!user) {
		return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
	}

	const profile = await getUserProfile(user.userId)
	if (!profile) {
		return Response.json({ error: { code: 'PROFILE_NOT_FOUND' } }, { status: 404 })
	}

	try {
		// Update all unread notifications for this user
		const result = await db
			.update(notifications)
			.set({ read: true })
			.where(and(eq(notifications.userId, profile.id), eq(notifications.read, false)))
			.returning({ id: notifications.id })

		return Response.json({ updatedCount: result.length })
	} catch (error) {
		captureServerException(error, {
			context: 'handleMarkAllNotificationsRead',
			userId: profile.id,
		})
		return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
	}
}

export const Route = createFileRoute('/api/notifications/read-all')({
	server: {
		handlers: {
			PUT: ({ request }) => handleMarkAllNotificationsRead(request),
		},
	},
})
