import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { captureException } from '@/integrations/posthog'
import { ApiError, errorResponseSchema } from '@/lib/errors'

/**
 * ## useDeleteOrganization
 *
 * Custom hook to delete an organization. Uses TanStack Query's useMutation
 * to handle the DELETE request to the organizations API. Only the organization
 * owner can delete it. Automatically handles authentication, invalidates the
 * organizations cache on success, and reports errors to PostHog.
 *
 * @example
 * const deleteOrg = useDeleteOrganization(orgId, {
 *   onSuccess: () => {
 *     navigate('/publisher/organizations')
 *   }
 * })
 *
 * const handleDelete = () => {
 *   deleteOrg.mutate()
 * }
 */
export function useDeleteOrganization(
	orgId: string,
	options?: {
		onSuccess?: () => void
	},
) {
	const { getToken } = useAuth()
	const queryClient = useQueryClient()

	const mutation = useMutation<undefined, ApiError>({
		mutationFn: async () => {
			const token = await getToken()
			if (!token) {
				throw new ApiError('NOT_AUTHENTICATED')
			}

			const response = await fetch(`/api/organizations/${orgId}`, {
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

			// DELETE returns 204 No Content on success
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({ queryKey: ['organizations'] })
			queryClient.removeQueries({ queryKey: ['organization', orgId] })
			options?.onSuccess?.()
		},
		onError: (error) => {
			captureException(error, {
				context: 'useDeleteOrganization',
				action: 'delete_organization',
				orgId,
			})
		},
	})

	return mutation
}
