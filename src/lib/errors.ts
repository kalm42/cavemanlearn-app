import { z } from 'zod'
import { m } from '@/paraglide/messages'

/**
 * ## ApiError
 *
 * Custom error class that carries a structured error code from the API.
 * This is the standard pattern for all mutation hooks that communicate
 * with API endpoints. API endpoints return `{ error: { code: string } }`
 * on failure, and hooks throw ApiError with that code.
 *
 * Consumers can check `error.code` to determine the type of error and
 * display appropriate localized messages using i18n.
 *
 * @example
 * // In mutation hooks:
 * if (!response.ok) {
 *   const errorData = await response.json()
 *   throw new ApiError(errorData.error.code)
 * }
 *
 * @example
 * // In components:
 * if (error instanceof ApiError && error.code === 'DUPLICATE_SLUG') {
 *   showDuplicateError()
 * }
 */
export class ApiError extends Error {
	code: string

	constructor(code: string) {
		super(`API Error: ${code}`)
		this.name = 'ApiError'
		this.code = code
	}
}

/**
 * ## errorResponseSchema
 *
 * Zod schema for validating structured error responses from API endpoints.
 * All API endpoints should return errors in this format.
 *
 * @example
 * const errorResult = errorResponseSchema.safeParse(await response.json())
 * if (errorResult.success) {
 *   throw new ApiError(errorResult.data.error.code)
 * }
 */
export const errorResponseSchema = z.object({
	error: z.object({
		code: z.string(),
	}),
})

/**
 * ## getProfileCreationErrorMessage
 *
 * Maps API error codes from profile creation operations to localized user-facing messages.
 * Works with ApiError instances thrown by mutation hooks.
 *
 * @example
 * const errorMessage = getProfileCreationErrorMessage(error)
 * return <div>{errorMessage}</div>
 */
export function getProfileCreationErrorMessage(error: unknown): string {
	if (error instanceof ApiError) {
		switch (error.code) {
			case 'UNAUTHORIZED':
			case 'NOT_AUTHENTICATED':
				return m.onboarding_error_not_authenticated()
			case 'PROFILE_EXISTS':
				return m.onboarding_error_profile_exists()
			case 'VALIDATION_ERROR':
			case 'INVALID_USER_TYPE':
				return m.onboarding_error_invalid_usertype()
			case 'INTERNAL_ERROR':
			case 'UNKNOWN_ERROR':
				return m.onboarding_error_server()
			default:
				return m.onboarding_error_unknown()
		}
	}

	if (!(error instanceof Error)) {
		return m.onboarding_error_unknown()
	}

	// Fallback: parse error messages for backwards compatibility with any code
	// that may still throw plain Error objects
	const message = error.message.toLowerCase()

	if (message.includes('not authenticated') || message.includes('unauthorized')) {
		return m.onboarding_error_not_authenticated()
	}

	if (message.includes('profile already exists')) {
		return m.onboarding_error_profile_exists()
	}

	if (message.includes('invalid usertype') || message.includes('must be')) {
		return m.onboarding_error_invalid_usertype()
	}

	if (message.includes('failed to create profile') || message.includes('unknown error')) {
		return m.onboarding_error_server()
	}

	return m.onboarding_error_unknown()
}
