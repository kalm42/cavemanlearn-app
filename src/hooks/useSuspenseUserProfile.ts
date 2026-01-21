import { useAuth, useUser } from '@clerk/clerk-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { z } from 'zod'
import { userProfileSchema } from '@/db/validators'

type UserProfile = z.infer<typeof userProfileSchema>

/**
 * ## useSuspenseUserProfile
 *
 * Suspense-enabled hook to fetch the current user's profile.
 * Must be used within a Suspense boundary. Throws if the user is not authenticated
 * or if no profile exists. Users without profiles should be routed to onboarding.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<Loading />}>
 *   <ProfileComponent />
 * </Suspense>
 *
 * function ProfileComponent() {
 *   const { profile } = useSuspenseUserProfile()
 *   return <ProfileDisplay profile={profile} />
 * }
 * ```
 */
export function useSuspenseUserProfile() {
	const { isSignedIn, isLoaded: userLoaded } = useUser()
	const { getToken } = useAuth()

	// Only run query when user is loaded and signed in
	if (!userLoaded || !isSignedIn) {
		throw new Error('Not authenticated')
	}

	const { data: profile } = useSuspenseQuery<UserProfile | null>({
		queryKey: ['user-profile'],
		queryFn: async () => {
			const token = await getToken()
			if (!token) {
				throw new Error('Not authenticated')
			}

			const response = await fetch('/api/user/profile', {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			if (response.status === 404) {
				return null
			}

			if (!response.ok) {
				throw new Error(`Failed to fetch profile: ${String(response.status)}`)
			}

			const data: unknown = (await response.json())
			return userProfileSchema.parse(data)
		},
	})

	return { profile }
}
