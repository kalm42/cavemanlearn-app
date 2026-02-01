import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { captureException } from '@/integrations/posthog'
import { ApiError, errorResponseSchema } from '@/lib/errors'

/**
 * ## useRemoveMember
 *
 * Custom hook to remove a member from an organization. Uses TanStack Query's useMutation
 * to handle the DELETE request. Automatically handles authentication, invalidates the
 * members cache on success, and reports errors to PostHog.
 *
 * @example
 * const removeMember = useRemoveMember(orgId, {
 *   onSuccess: () => {
 *     toast.success('Member removed successfully')
 *   }
 * })
 *
 * const handleRemove = (memberId: string) => {
 *   removeMember.mutate(memberId)
 * }
 */
export function useRemoveMember(
	orgId: string,
	options?: {
		onSuccess?: () => void
		onError?: (error: ApiError) => void
	},
) {
	const { getToken } = useAuth()
	const queryClient = useQueryClient()

	const mutation = useMutation<undefined, ApiError, string>({
		mutationFn: async (memberId) => {
			const token = await getToken()
			if (!token) {
				throw new ApiError('NOT_AUTHENTICATED')
			}

			const response = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
				},
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
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['organization', orgId, 'members'] })
			void queryClient.invalidateQueries({ queryKey: ['organization', orgId] })
			options?.onSuccess?.()
		},
		onError: (error) => {
			captureException(error, {
				context: 'useRemoveMember',
				action: 'remove_member',
				orgId,
			})
			options?.onError?.(error)
		},
	})

	return mutation
}
