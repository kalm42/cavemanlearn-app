import { m } from '@/paraglide/messages'

/**
 * ## getProfileCreationErrorMessage
 *
 * Maps error messages from profile creation operations to localized user-facing messages.
 * Provides deterministic error handling for user-facing error messages.
 *
 * @example
 * const errorMessage = getProfileCreationErrorMessage(error)
 * return <div>{errorMessage}</div>
 */
export function getProfileCreationErrorMessage(error: unknown): string {
	if (!(error instanceof Error)) {
		return m.onboarding_error_unknown()
	}

	const message = error.message.toLowerCase()

	// Authentication errors
	if (message.includes('not authenticated') || message.includes('unauthorized')) {
		return m.onboarding_error_not_authenticated()
	}

	// Profile already exists
	if (message.includes('profile already exists')) {
		return m.onboarding_error_profile_exists()
	}

	// Invalid userType
	if (message.includes('invalid usertype') || message.includes('must be')) {
		return m.onboarding_error_invalid_usertype()
	}

	// Network/server errors
	if (message.includes('failed to create profile') || message.includes('unknown error')) {
		return m.onboarding_error_server()
	}

	// Default fallback
	return m.onboarding_error_unknown()
}
