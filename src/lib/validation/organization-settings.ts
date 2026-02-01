import { z } from 'zod'

/**
 * Regex pattern for validating hex color codes.
 * Matches both 3-digit (#RGB) and 6-digit (#RRGGBB) formats.
 */
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

/**
 * ## updateOrganizationSettingsRequestSchema
 *
 * Zod schema for validating organization settings update requests. All fields are optional,
 * but at least one field must be provided. Pricing values must be positive integers (in cents),
 * and brand colors must be valid hex color codes.
 *
 * @example
 * const result = updateOrganizationSettingsRequestSchema.safeParse({
 *   defaultMonthlyPrice: 999,
 *   brandColorPrimary: '#FF5733'
 * })
 *
 * @example
 * // Clear a field by setting it to null
 * updateOrganizationSettingsRequestSchema.parse({
 *   brandColorPrimary: null
 * })
 */
export const updateOrganizationSettingsRequestSchema = z
	.object({
		defaultMonthlyPrice: z
			.number()
			.int('Monthly price must be a whole number')
			.positive('Monthly price must be positive')
			.nullish(),
		defaultYearlyPrice: z
			.number()
			.int('Yearly price must be a whole number')
			.positive('Yearly price must be positive')
			.nullish(),
		brandColorPrimary: z
			.string()
			.regex(HEX_COLOR_REGEX, 'Brand color must be a valid hex color (e.g., #FF5733)')
			.nullish(),
		brandColorSecondary: z
			.string()
			.regex(HEX_COLOR_REGEX, 'Brand color must be a valid hex color (e.g., #FF5733)')
			.nullish(),
		brandLogoUrl: z.url('Brand logo URL must be a valid URL').nullish(),
	})
	.refine(
		(data) =>
			data.defaultMonthlyPrice !== undefined ||
			data.defaultYearlyPrice !== undefined ||
			data.brandColorPrimary !== undefined ||
			data.brandColorSecondary !== undefined ||
			data.brandLogoUrl !== undefined,
		{ message: 'At least one field must be provided for update' },
	)

export type UpdateOrganizationSettingsRequest = z.infer<
	typeof updateOrganizationSettingsRequestSchema
>
