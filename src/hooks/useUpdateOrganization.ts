import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import type { UpdateOrganizationRequest } from '@/lib/validation/organization'
import { organizationSchema } from '@/db/validators'
import { captureException } from '@/integrations/posthog'
import { ApiError, errorResponseSchema } from '@/lib/errors'

const updateOrganizationResponseSchema = z.object({
	organization: organizationSchema,
})

type UpdateOrganizationResponse = z.infer<typeof updateOrganizationResponseSchema>

/**
 * ## useUpdateOrganization
 *
 * Custom hook to update an organization. Uses TanStack Query's useMutation
 * to handle the PUT request to the organizations API. Automatically handles
 * authentication, validates the response, invalidates both the organizations list
 * and single organization caches on success, and reports errors to PostHog.
 *
 * @example
 * const updateOrg = useUpdateOrganization(orgId, {
 *   onSuccess: (data) => {
 *     showSuccessMessage('Organization updated')
 *   }
 * })
 *
 * const handleSubmit = (data: UpdateOrganizationRequest) => {
 *   updateOrg.mutate(data)
 * }
 */
export function useUpdateOrganization(
	orgId: string,
	options?: {
		onSuccess?: (data: UpdateOrganizationResponse) => void
	},
) {
	const { getToken } = useAuth()
	const queryClient = useQueryClient()

	const mutation = useMutation<UpdateOrganizationResponse, ApiError, UpdateOrganizationRequest>({
		mutationFn: async (data) => {
			const token = await getToken()
			if (!token) {
				throw new ApiError('NOT_AUTHENTICATED')
			}

			const response = await fetch(`/api/organizations/${orgId}`, {
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
			return updateOrganizationResponseSchema.parse(responseData)
		},
		onSuccess: (data) => {
			void queryClient.invalidateQueries({ queryKey: ['organizations'] })
			void queryClient.invalidateQueries({ queryKey: ['organization', orgId] })
			options?.onSuccess?.(data)
		},
		onError: (error) => {
			captureException(error, {
				context: 'useUpdateOrganization',
				action: 'update_organization',
				orgId,
			})
		},
	})

	return mutation
}
