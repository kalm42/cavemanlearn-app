import { z } from 'zod'

/**
 * ## updateProfileRequestSchema
 *
 * Zod schema for validating user profile update requests. Allows optional
 * displayName and avatarUrl fields. At least one field must be provided
 * for a valid update request.
 *
 * @example
 * const result = updateProfileRequestSchema.safeParse({ displayName: 'John Doe' })
 * if (result.success) {
 *   console.log(result.data.displayName)
 * }
 *
 * @example
 * // Both fields are optional
 * updateProfileRequestSchema.parse({ avatarUrl: 'https://example.com/avatar.png' })
 */
export const updateProfileRequestSchema = z
	.object({
		displayName: z.string().min(1).max(100).nullish(),
		avatarUrl: z.url().nullish(),
	})
	.refine((data) => data.displayName !== undefined || data.avatarUrl !== undefined, {
		message: 'At least one field (displayName or avatarUrl) must be provided',
	})
