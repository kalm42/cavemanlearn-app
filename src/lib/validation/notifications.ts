import { z } from 'zod'

/**
 * ## getNotificationsQuerySchema
 *
 * Zod schema for validating query parameters on the GET /api/notifications endpoint.
 * Supports cursor-based pagination with optional read status filtering.
 *
 * @example
 * const query = getNotificationsQuerySchema.parse({ limit: '10', read: 'false' })
 * console.log(query.limit) // 10
 */
export const getNotificationsQuerySchema = z.object({
	cursor: z.iso.datetime().optional(),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	read: z.enum(['true', 'false', 'all']).default('all'),
})

export type GetNotificationsQuery = z.infer<typeof getNotificationsQuerySchema>
