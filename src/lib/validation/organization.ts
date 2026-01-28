import { z } from 'zod'

/**
 * ## createOrganizationRequestSchema
 *
 * Zod schema for validating organization creation requests. Requires a name
 * field and optionally accepts a description. The name must be between 1-100
 * characters.
 *
 * @example
 * const result = createOrganizationRequestSchema.safeParse({ name: 'My Organization' })
 * if (result.success) {
 *   console.log(result.data.name)
 * }
 *
 * @example
 * // With description
 * createOrganizationRequestSchema.parse({
 *   name: 'My Org',
 *   description: 'A description of my organization'
 * })
 */
export const createOrganizationRequestSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
	description: z.string().max(500, 'Description must be 500 characters or less').nullish(),
})

export type CreateOrganizationRequest = z.infer<typeof createOrganizationRequestSchema>
