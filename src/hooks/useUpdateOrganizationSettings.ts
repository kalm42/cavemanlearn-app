import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import type { UpdateOrganizationSettingsRequest } from '@/lib/validation/organization-settings'
import type { OrganizationSettings } from '@/db/schema'
import { organizationSettingsSchema } from '@/db/validators'
import { captureException } from '@/integrations/posthog'
import { ApiError, errorResponseSchema } from '@/lib/errors'

const updateOrganizationSettingsResponseSchema = z.object({
	settings: organizationSettingsSchema,
})

type UpdateOrganizationSettingsResponse = z.infer<typeof updateOrganizationSettingsResponseSchema>

/**
 * ## useUpdateOrganizationSettings
 *
 * Custom hook to update organization settings. Uses TanStack Query's useMutation
 * to handle the PUT request to the organization settings API. Automatically handles
 * authentication, validates the response, invalidates the organization settings cache
 * on success, and reports errors to PostHog.
 *
 * @example
 * const updateSettings = useUpdateOrganizationSettings(orgId, {
 *   onSuccess: (data) => {
 *     showSuccessMessage('Settings updated')
 *   }
 * })
 *
 * const handleSubmit = (data: UpdateOrganizationSettingsRequest) => {
 *   updateSettings.mutate(data)
 * }
 */
export function useUpdateOrganizationSettings(
	orgId: string,
	options?: {
		onSuccess?: (data: UpdateOrganizationSettingsResponse) => void
	},
) {
	const { getToken } = useAuth()
	const queryClient = useQueryClient()

	const mutation = useMutation<
		UpdateOrganizationSettingsResponse,
		ApiError,
		UpdateOrganizationSettingsRequest
	>({
		mutationFn: async (data) => {
			const token = await getToken()
			if (!token) {
				throw new ApiError('NOT_AUTHENTICATED')
			}

			const response = await fetch(`/api/organizations/${orgId}/settings`, {
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
			return updateOrganizationSettingsResponseSchema.parse(responseData)
		},
		onSuccess: (data) => {
			void queryClient.invalidateQueries({ queryKey: ['organizationSettings', orgId] })
			queryClient.setQueryData<OrganizationSettings>(['organizationSettings', orgId], data.settings)
			options?.onSuccess?.(data)
		},
		onError: (error) => {
			captureException(error, {
				context: 'useUpdateOrganizationSettings',
				action: 'update_organization_settings',
				orgId,
			})
		},
	})

	return mutation
}
