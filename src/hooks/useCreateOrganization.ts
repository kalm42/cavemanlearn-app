import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import type { CreateOrganizationRequest } from '@/lib/validation/organization'
import { organizationMemberSchema, organizationSchema } from '@/db/validators'
import { captureException } from '@/integrations/posthog'
import { ApiError, errorResponseSchema } from '@/lib/errors'

const createOrganizationResponseSchema = z.object({
	organization: organizationSchema,
	membership: organizationMemberSchema,
})

type CreateOrganizationResponse = z.infer<typeof createOrganizationResponseSchema>

/**
 * ## useCreateOrganization
 *
 * Custom hook to create a new organization. Uses TanStack Query's useMutation
 * to handle the POST request to the organizations API. Automatically handles
 * authentication, validates the response, invalidates the organizations cache
 * on success, and reports errors to PostHog.
 *
 * @example
 * const createOrg = useCreateOrganization({
 *   onSuccess: (data) => {
 *     navigate(`/publisher/organizations/${data.organization.id}`)
 *   }
 * })
 *
 * const handleSubmit = (data: CreateOrganizationRequest) => {
 *   createOrg.mutate(data)
 * }
 */
export function useCreateOrganization(options?: {
	onSuccess?: (data: CreateOrganizationResponse) => void
}) {
	const { getToken } = useAuth()
	const queryClient = useQueryClient()

	const mutation = useMutation<CreateOrganizationResponse, ApiError, CreateOrganizationRequest>({
		mutationFn: async (data) => {
			const token = await getToken()
			if (!token) {
				throw new ApiError('NOT_AUTHENTICATED')
			}

			const response = await fetch('/api/organizations', {
				method: 'POST',
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
			return createOrganizationResponseSchema.parse(responseData)
		},
		onSuccess: (data) => {
			void queryClient.invalidateQueries({ queryKey: ['organizations'] })
			options?.onSuccess?.(data)
		},
		onError: (error) => {
			captureException(error, {
				context: 'useCreateOrganization',
				action: 'create_organization',
			})
		},
	})

	return mutation
}
