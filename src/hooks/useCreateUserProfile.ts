import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { z } from 'zod'
import type { UserType } from '../components/user/OnboardingForm'
import { userProfileSchema } from '@/db/validators'
import { captureException } from '@/integrations/posthog'
import { ApiError, errorResponseSchema } from '@/lib/errors'

type UserProfile = z.infer<typeof userProfileSchema>

/**
 * ## useCreateUserProfile
 *
 * Custom hook to create a user profile.
 * Returns a mutation object with methods to create a profile and track its state.
 * Automatically handles authentication, request formatting, error handling, and response validation.
 * Invalidates the user-profile query cache on success.
 *
 * @example
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
 */
export function useCreateUserProfile(options?: { onSuccess?: (profile: UserProfile) => void }) {
	const { getToken } = useAuth()
	const queryClient = useQueryClient()

	const mutation = useMutation<UserProfile, ApiError, UserType>({
		mutationFn: async (userType) => {
			const token = await getToken()
			if (!token) {
				throw new ApiError('NOT_AUTHENTICATED')
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
					.catch(() => ({ error: { code: 'UNKNOWN_ERROR' } }) as const)) as unknown
				const errorResult = errorResponseSchema.safeParse(errorResponseRaw)
				if (errorResult.success) {
					throw new ApiError(errorResult.data.error.code)
				}
				throw new ApiError('UNKNOWN_ERROR')
			}

			const data = (await response.json()) as unknown
			return userProfileSchema.parse(data)
		},
		onSuccess: (data) => {
			void queryClient.invalidateQueries({ queryKey: ['user-profile'] })
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
