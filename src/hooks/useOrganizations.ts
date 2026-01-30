import { useAuth, useUser } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { z } from 'zod'
import type { OrganizationWithRole } from '@/db/validators'
import { organizationWithRoleSchema } from '@/db/validators'
import { captureException } from '@/integrations/posthog'

export type { OrganizationWithRole } from '@/db/validators'

const organizationsResponseSchema = z.object({
	organizations: z.array(organizationWithRoleSchema),
})

/**
 * ## useOrganizations
 *
 * Custom hook to fetch the current user's organizations. Returns the list of
 * organizations the user is a member of, including their role in each organization.
 * Handles authentication and validates response data with Zod.
 *
 * @example
 * const { organizations, isLoading, error } = useOrganizations()
 * if (isLoading) return <Loading />
 * if (error) return <Error message={error.message} />
 * return <OrganizationList organizations={organizations} />
 */
export function useOrganizations(options?: { enabled?: boolean }) {
	const { isSignedIn, isLoaded: userLoaded } = useUser()
	const { getToken } = useAuth()

	const {
		data: organizations,
		isLoading,
		error,
	} = useQuery<Array<OrganizationWithRole>>({
		queryKey: ['organizations'],
		queryFn: async () => {
			const token = await getToken()
			if (!token) {
				throw new Error('Not authenticated')
			}

			const response = await fetch('/api/organizations', {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			if (!response.ok) {
				throw new Error(`Failed to fetch organizations: ${String(response.status)}`)
			}

			const data = (await response.json()) as unknown
			const validated = organizationsResponseSchema.parse(data)
			return validated.organizations
		},
		enabled: options?.enabled ?? (userLoaded && isSignedIn),
	})

	// Report errors to PostHog for monitoring
	useEffect(() => {
		if (error) {
			captureException(error, {
				context: 'useOrganizations',
				action: 'fetch_organizations',
			})
		}
	}, [error])

	return {
		organizations: organizations ?? [],
		isLoading,
		error: error instanceof Error ? error : null,
	}
}
