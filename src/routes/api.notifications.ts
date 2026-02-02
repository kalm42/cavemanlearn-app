import { createFileRoute } from '@tanstack/react-router'
import { and, desc, eq, lt } from 'drizzle-orm'

import { db } from '@/db/index.ts'
import { notifications } from '@/db/schema.ts'
import { notificationSchema, paginatedNotificationsResponseSchema } from '@/db/validators.ts'
import { captureServerException } from '@/integrations/posthog/server.ts'
import { getCurrentUser, getUserProfile } from '@/lib/auth.ts'
import { getNotificationsQuerySchema } from '@/lib/validation/notifications.ts'

/**
 * ## handleGetNotifications
 *
 * Handles GET requests to retrieve a user's notifications with cursor-based pagination.
 * Supports filtering by read status and ordering by createdAt DESC. Returns 401 if
 * unauthenticated, 404 if user profile doesn't exist, or 200 with paginated notifications.
 *
 * @example
 * const response = await handleGetNotifications(request)
 * const { notifications, pagination } = await response.json()
 */
export async function handleGetNotifications(request: Request): Promise<Response> {
	const user = await getCurrentUser(request)
	if (!user) {
		return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
	}

	const profile = await getUserProfile(user.userId)
	if (!profile) {
		return Response.json({ error: { code: 'PROFILE_NOT_FOUND' } }, { status: 404 })
	}

	// Parse query parameters
	const url = new URL(request.url)
	const queryParams = {
		cursor: url.searchParams.get('cursor') ?? undefined,
		limit: url.searchParams.get('limit') ?? undefined,
		read: url.searchParams.get('read') ?? undefined,
	}

	const queryResult = getNotificationsQuerySchema.safeParse(queryParams)
	if (!queryResult.success) {
		return Response.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
	}

	const { cursor, limit, read } = queryResult.data

	// Build query conditions
	const conditions = [eq(notifications.userId, profile.id)]

	if (cursor) {
		conditions.push(lt(notifications.createdAt, new Date(cursor)))
	}

	if (read === 'true') {
		conditions.push(eq(notifications.read, true))
	} else if (read === 'false') {
		conditions.push(eq(notifications.read, false))
	}

	try {
		// Fetch limit + 1 to determine if there are more results
		const results = await db
			.select()
			.from(notifications)
			.where(and(...conditions))
			.orderBy(desc(notifications.createdAt))
			.limit(limit + 1)

		const hasMore = results.length > limit
		const notificationResults = hasMore ? results.slice(0, limit) : results

		// Validate each notification
		const validatedNotifications = notificationResults.map((n) => notificationSchema.parse(n))

		// Determine next cursor
		const lastNotification = validatedNotifications.at(-1)
		const nextCursor = hasMore && lastNotification ? lastNotification.createdAt.toISOString() : null

		const response = paginatedNotificationsResponseSchema.parse({
			notifications: validatedNotifications,
			pagination: {
				nextCursor,
				hasMore,
			},
		})

		return Response.json(response)
	} catch (error) {
		captureServerException(error, {
			context: 'handleGetNotifications',
			userId: profile.id,
		})
		return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
	}
}

export const Route = createFileRoute('/api/notifications')({
	server: {
		handlers: {
			GET: ({ request }) => handleGetNotifications(request),
		},
	},
})
