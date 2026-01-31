import { useAuth, useUser } from '@clerk/clerk-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import type { OrganizationWithRole } from '@/db/validators'
import { organizationWithRoleSchema } from '@/db/validators'

const organizationResponseSchema = z.object({
	organization: organizationWithRoleSchema,
})

/**
 * ## useSuspenseOrganization
 *
 * Suspense-enabled hook to fetch a single organization by ID. Returns the
 * organization data including the current user's role and member count.
 * Must be used within a Suspense boundary.
 *
 * @example
 * <Suspense fallback={<Loading />}>
 *   <OrganizationContent orgId={orgId} />
 * </Suspense>
 *
 * function OrganizationContent({ orgId }) {
 *   const { organization } = useSuspenseOrganization(orgId)
 *   return <Dashboard organization={organization} />
 * }
 */
export function useSuspenseOrganization(orgId: string) {
	const { isSignedIn, isLoaded: userLoaded } = useUser()
	const { getToken } = useAuth()

	if (!userLoaded || !isSignedIn) {
		throw new Error('Not authenticated')
	}

	const { data: organization } = useSuspenseQuery<OrganizationWithRole | null>({
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
	})

	return { organization }
}
