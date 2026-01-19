import { getProfileCreationErrorMessage } from '@/lib/errors'

interface ProfileCreationErrorProps {
	error: unknown
}

/**
 * ## ProfileCreationError
 *
 * Displays user-friendly error messages for profile creation failures.
 * Maps errors to localized messages and renders them in a styled error container.
 * Returns null if no error is provided.
 *
 * @example
 * <ProfileCreationError error={mutation.error} />
 */
export function ProfileCreationError(props: ProfileCreationErrorProps) {
	const { error } = props

	if (!error) {
		return null
	}

	const errorMessage = getProfileCreationErrorMessage(error)

	return (
		<div className="mt-4 text-center">
			<div className="text-red-400 inline-block px-4 py-2 bg-red-900/20 rounded-lg">
				<p>{errorMessage}</p>
			</div>
		</div>
	)
}
