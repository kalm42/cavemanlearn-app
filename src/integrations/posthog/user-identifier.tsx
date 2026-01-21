import { useUser } from '@clerk/clerk-react'
import { usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'

/**
 * ## PostHogUserIdentifier
 *
 * Automatically identifies users in PostHog when they sign in via Clerk.
 * Resets the PostHog identity when users sign out. This component must be
 * placed inside both PostHogProvider and ClerkProvider.
 *
 * @example
 * <PostHogProvider>
 *   <ClerkProvider>
 *     <PostHogUserIdentifier />
 *     <App />
 *   </ClerkProvider>
 * </PostHogProvider>
 */
export default function PostHogUserIdentifier() {
	const { user, isSignedIn, isLoaded } = useUser()
	const posthog = usePostHog()

	useEffect(() => {
		if (!isLoaded) {
			return
		}

		if (isSignedIn) {
			posthog.identify(user.id, {
				email: user.primaryEmailAddress?.emailAddress,
				name: user.fullName,
				firstName: user.firstName,
				lastName: user.lastName,
				username: user.username,
				createdAt: user.createdAt?.toISOString(),
			})
		} else {
			posthog.reset()
		}
	}, [isLoaded, isSignedIn, user, posthog])

	return null
}
