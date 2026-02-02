import { useAuth } from '@clerk/clerk-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { organizationSettingsSchema } from '@/db/validators'
import { captureException } from '@/integrations/posthog'
import { ApiError, errorResponseSchema } from '@/lib/errors'

const organizationSettingsResponseSchema = z.object({
	settings: organizationSettingsSchema,
})

/**
 * ## useOrganizationSettings
 *
 * Custom hook to fetch organization settings using Suspense. Uses TanStack Query's
 * useSuspenseQuery to automatically suspend while loading. Validates the response
 * with Zod and throws ApiError on failure.
 *
 * @example
 * const { settings } = useOrganizationSettings(orgId)
 * console.log(settings.defaultMonthlyPrice)
 *
 * @example
 * // Wrap in Suspense boundary
 * <Suspense fallback={<Loading />}>
 *   <SettingsForm orgId={orgId} />
 * </Suspense>
 */
export function useOrganizationSettings(orgId: string) {
	const { getToken } = useAuth()

	const query = useSuspenseQuery({
		queryKey: ['organizationSettings', orgId],
		queryFn: async () => {
			const token = await getToken()
			if (!token) {
				throw new ApiError('NOT_AUTHENTICATED')
			}

			const response = await fetch(`/api/organizations/${orgId}/settings`, {
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
					captureException(new ApiError(errorResult.data.error.code), {
						context: 'useOrganizationSettings',
						action: 'fetch_settings',
						orgId,
					})
					throw new ApiError(errorResult.data.error.code)
				}
				throw new ApiError('UNKNOWN_ERROR')
			}

			const responseData = (await response.json()) as unknown
			const parsed = organizationSettingsResponseSchema.parse(responseData)
			return parsed.settings
		},
	})

	return { settings: query.data }
}
