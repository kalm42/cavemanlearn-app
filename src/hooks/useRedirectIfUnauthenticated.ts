import { useUser } from '@clerk/clerk-react'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

/**
 * ## useRedirectIfUnauthenticated
 *
 * Redirects unauthenticated users to a specified route when authentication state is loaded.
 * Useful for protecting routes that require authentication.
 *
 * @example
 * // Redirect to home page if not authenticated
 * useRedirectIfUnauthenticated()
 *
 * @example
 * // Redirect to a custom route if not authenticated
 * useRedirectIfUnauthenticated({ redirectTo: '/login' })
 */
export function useRedirectIfUnauthenticated(options?: { redirectTo?: string }) {
	const { isSignedIn, isLoaded: userLoaded } = useUser()
	const navigate = useNavigate()
	const redirectTo = options?.redirectTo ?? '/'

	useEffect(() => {
		if (userLoaded && !isSignedIn) {
			void navigate({ to: redirectTo })
		}
	}, [userLoaded, isSignedIn, navigate, redirectTo])
}
