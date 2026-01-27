import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import type { UserType } from '../components/user/OnboardingForm'
import { userProfileSchema } from '@/db/validators'
import { captureException } from '@/integrations/posthog'

type UserProfile = z.infer<typeof userProfileSchema>

const errorResponseSchema = z.object({
	error: z.string(),
})

/**
 * Custom hook to create a user profile.
 * Returns a mutation object with methods to create a profile and track its state.
 * Automatically handles authentication, request formatting, error handling, and response validation.
 * Invalidates the user-profile query cache on success.
 *
 * @param options - Configuration options for the hook
 * @param options.onSuccess - Callback function called when profile creation succeeds
 *
 * @example
 * ```tsx
 * const createProfile = useCreateUserProfile({
 *   onSuccess: (profile) => {
 *     console.log('Profile created:', profile.userType)
 *     navigate('/dashboard')
 *   }
 * })
 *
 * const handleSubmit = async (userType: UserType) => {
 *   await createProfile.mutateAsync(userType)
 * }
 * ```
 */
export function useCreateUserProfile(options?: { onSuccess?: (profile: UserProfile) => void }) {
	const { getToken } = useAuth()
	const queryClient = useQueryClient()

	const mutation = useMutation<UserProfile, Error, UserType>({
		mutationFn: async (userType: UserType) => {
			const token = await getToken()
			if (!token) {
				throw new Error('Not authenticated')
			}

			const response = await fetch('/api/user/profile', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ userType }),
			})

			if (!response.ok) {
				const errorResponseRaw = (await response
					.json()
					.catch(() => ({ error: 'Unknown error' }) as const)) as unknown
				const errorResult = errorResponseSchema.safeParse(errorResponseRaw)
				const errorMessage = errorResult.success
					? errorResult.data.error
					: `Failed to create profile: ${String(response.status)}`
				throw new Error(errorMessage)
			}

			const data = (await response.json()) as unknown
			return userProfileSchema.parse(data)
		},
		onSuccess: (data) => {
			// Invalidate the user-profile query to refetch the new profile
			void queryClient.invalidateQueries({ queryKey: ['user-profile'] })
			// Call the optional onSuccess callback
			options?.onSuccess?.(data)
		},
		onError: (error) => {
			captureException(error, {
				context: 'useCreateUserProfile',
				action: 'create_profile',
			})
		},
	})

	return mutation
}
