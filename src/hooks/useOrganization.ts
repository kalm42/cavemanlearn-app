import { useAuth, useUser } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { z } from 'zod'
import type { OrganizationWithRole } from '@/db/validators'
import { organizationWithRoleSchema } from '@/db/validators'
import { captureException } from '@/integrations/posthog'

const organizationResponseSchema = z.object({
	organization: organizationWithRoleSchema,
})

/**
 * ## useOrganization
 *
 * Custom hook to fetch a single organization by ID. Returns the organization data
 * including the current user's role in that organization and the member count.
 * Handles authentication and validates response data with Zod.
 *
 * @example
 * const { organization, isLoading, error } = useOrganization(orgId)
 * if (isLoading) return <Loading />
 * if (error) return <Error message={error.message} />
 * if (!organization) return <NotFound />
 * return <OrganizationDashboard organization={organization} />
 */
export function useOrganization(orgId: string, options?: { enabled?: boolean }) {
	const { isSignedIn, isLoaded: userLoaded } = useUser()
	const { getToken } = useAuth()

	const {
		data: organization,
		isLoading,
		error,
	} = useQuery<OrganizationWithRole | null>({
		queryKey: ['organization', orgId],
		queryFn: async () => {
			const token = await getToken()
			if (!token) {
				throw new Error('Not authenticated')
			}

			const response = await fetch(`/api/organizations/${orgId}`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			if (response.status === 404 || response.status === 403) {
				return null
			}

			if (!response.ok) {
				throw new Error(`Failed to fetch organization: ${String(response.status)}`)
			}

			const data = (await response.json()) as unknown
			const validated = organizationResponseSchema.parse(data)
			return validated.organization
		},
		enabled: options?.enabled ?? (userLoaded && isSignedIn),
	})

	useEffect(() => {
		if (error) {
			captureException(error, {
				context: 'useOrganization',
				action: 'fetch_organization',
				orgId,
			})
		}
	}, [error, orgId])

	return {
		organization: organization ?? null,
		isLoading,
		error: error instanceof Error ? error : null,
	}
}
