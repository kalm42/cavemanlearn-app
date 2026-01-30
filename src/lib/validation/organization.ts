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
	name: z
		.string()
		.trim()
		.min(1, 'Name is required')
		.max(100, 'Name must be 100 characters or less'),
	description: z
		.string()
		.max(500, 'Description must be 500 characters or less')
		.transform((val) => (val === '' ? null : val))
		.nullish(),
})

export type CreateOrganizationRequest = z.infer<typeof createOrganizationRequestSchema>

/**
 * ## updateOrganizationRequestSchema
 *
 * Zod schema for validating organization update requests. All fields are optional,
 * but at least one field should be provided. Name must be between 1-100 characters,
 * description up to 500 characters, and logoUrl must be a valid URL.
 *
 * @example
 * const result = updateOrganizationRequestSchema.safeParse({ name: 'New Name' })
 * if (result.success) {
 *   console.log(result.data.name)
 * }
 *
 * @example
 * // Update multiple fields
 * updateOrganizationRequestSchema.parse({
 *   name: 'Updated Org',
 *   description: 'New description',
 *   logoUrl: 'https://example.com/logo.png'
 * })
 */
export const updateOrganizationRequestSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, 'Name is required')
			.max(100, 'Name must be 100 characters or less')
			.optional(),
		description: z
			.string()
			.max(500, 'Description must be 500 characters or less')
			.transform((val) => (val === '' ? null : val))
			.nullish(),
		logoUrl: z.url('Logo URL must be a valid URL').nullish(),
	})
	.refine(
		(data) =>
			data.name !== undefined || data.description !== undefined || data.logoUrl !== undefined,
		{ message: 'At least one field must be provided for update' },
	)

export type UpdateOrganizationRequest = z.infer<typeof updateOrganizationRequestSchema>
