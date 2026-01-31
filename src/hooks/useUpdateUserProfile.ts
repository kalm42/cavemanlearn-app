import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { z } from 'zod'
import type { updateProfileRequestSchema } from '@/lib/validation/user'
import { userProfileSchema } from '@/db/validators'
import { captureException } from '@/integrations/posthog'
import { ApiError, errorResponseSchema } from '@/lib/errors'

type UserProfile = z.infer<typeof userProfileSchema>
type UpdateProfileData = z.infer<typeof updateProfileRequestSchema>

/**
 * ## useUpdateUserProfile
 *
 * Custom hook to update the current user's profile.
 * Returns a mutation object with methods to update profile and track its state.
 * Automatically handles authentication, request formatting, error handling, and response validation.
 * Invalidates the user-profile query cache on success.
 *
 * @example
 * const updateProfile = useUpdateUserProfile({
 *   onSuccess: (profile) => {
 *     console.log('Profile updated:', profile.displayName)
 *   }
 * })
 *
 * const handleSubmit = async (displayName: string) => {
 *   await updateProfile.mutateAsync({ displayName })
 * }
 */
export function useUpdateUserProfile(options?: { onSuccess?: (profile: UserProfile) => void }) {
	const { getToken } = useAuth()
	const queryClient = useQueryClient()

	const mutation = useMutation<UserProfile, ApiError, UpdateProfileData>({
		mutationFn: async (data) => {
			const token = await getToken()
			if (!token) {
				throw new ApiError('NOT_AUTHENTICATED')
			}

			const response = await fetch('/api/user/profile', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(data),
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

			const responseData = (await response.json()) as unknown
			return userProfileSchema.parse(responseData)
		},
		onSuccess: (data) => {
			void queryClient.invalidateQueries({ queryKey: ['user-profile'] })
			options?.onSuccess?.(data)
		},
		onError: (error) => {
			captureException(error, {
				context: 'useUpdateUserProfile',
				action: 'update_profile',
			})
		},
	})

	return mutation
}
