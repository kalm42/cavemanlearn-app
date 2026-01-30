import { z } from 'zod'

/**
 * ## uuidSchema
 *
 * Zod schema for validating UUID format. Use this for validating route
 * parameters and other UUID inputs.
 *
 * @example
 * const result = uuidSchema.safeParse('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
 * if (result.success) {
 *   console.log('Valid UUID')
 * }
 */
export const uuidSchema = z.uuid()

/**
 * ## validateUuid
 *
 * Validates that a string is a valid UUID format. Returns a 400 Response
 * with an error message if invalid, or null if valid.
 *
 * @example
 * const error = validateUuid(orgId, 'organization ID')
 * if (error) return error
 */
export function validateUuid(value: string, fieldName: string): Response | null {
	const result = uuidSchema.safeParse(value)
	if (!result.success) {
		return Response.json({ error: `Invalid ${fieldName} format` }, { status: 400 })
	}
	return null
}

/**
 * ## validateUuids
 *
 * Validates multiple UUIDs at once. Returns a 400 Response with an error
 * message for the first invalid UUID, or null if all are valid.
 *
 * @example
 * const error = validateUuids([
 *   [orgId, 'organization ID'],
 *   [memberId, 'member ID'],
 * ])
 * if (error) return error
 */
export function validateUuids(values: Array<[string, string]>): Response | null {
	for (const [value, fieldName] of values) {
		const error = validateUuid(value, fieldName)
		if (error) return error
	}
	return null
}
