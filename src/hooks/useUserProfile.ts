import { useAuth, useUser } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import type { z } from 'zod'
import { userProfileSchema } from '@/db/validators'

type UserProfile = z.infer<typeof userProfileSchema>

/**
 * Custom hook to fetch the current user's profile.
 * Returns the profile data, loading state, and error state.
 * Automatically handles authentication and profile fetching.
 *
 * @param options - Configuration options for the hook
 * @param options.enabled - Whether the query should run (defaults to true when user is loaded and signed in)
 *
 * @example
 * ```tsx
 * const { profile, isLoading, error } = useUserProfile()
 * if (isLoading) return <Loading />
 * if (error) return <Error message={error.message} />
 * if (!profile) return <NoProfile />
 * return <ProfileDisplay profile={profile} />
 * ```
 */
export function useUserProfile(options?: { enabled?: boolean }) {
	const { isSignedIn, isLoaded: userLoaded } = useUser()
	const { getToken } = useAuth()

	const {
		data: profile,
		isLoading,
		error,
	} = useQuery<UserProfile | null>({
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
		enabled: options?.enabled ?? (userLoaded && isSignedIn),
	})

	return {
		profile,
		isLoading,
		error: error instanceof Error ? error : null,
	}
}
