import { useAuth, useUser } from '@clerk/clerk-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { z } from 'zod'
import { userProfileSchema } from '@/db/validators'

type UserProfile = z.infer<typeof userProfileSchema>

/**
 * ## useSuspenseUserProfile
 *
 * Suspense-enabled hook to fetch the current user's profile.
 * Must be used within a Suspense boundary. The query will only run when the user is loaded and signed in.
 * Returns the profile data (which may be null if no profile exists).
 *
 * @example
 * ```tsx
 * <Suspense fallback={<Loading />}>
 *   <ProfileComponent />
 * </Suspense>
 *
 * function ProfileComponent() {
 *   const { profile } = useSuspenseUserProfile()
 *   if (!profile) return <NoProfile />
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
				return null // No profile exists yet
			}

			if (!response.ok) {
				throw new Error(`Failed to fetch profile: ${String(response.status)}`)
			}

			const data = (await response.json()) as unknown
			return userProfileSchema.parse(data)
		},
	})

	return { profile }
}
