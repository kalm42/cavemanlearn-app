import { useAuth, useUser } from '@clerk/clerk-react'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { z } from 'zod'
import type { MemberWithProfile } from '@/lib/validation/organization-members'
import { memberWithProfileSchema } from '@/lib/validation/organization-members'
import { captureException } from '@/integrations/posthog'

const membersResponseSchema = z.object({
	members: z.array(memberWithProfileSchema),
})

/**
 * ## useMembers
 *
 * Custom hook to fetch all members of an organization. Returns the list of members
 * with their profile information and roles. Handles authentication and validates
 * response data with Zod.
 *
 * @example
 * const { members, isLoading, error, refetch } = useMembers(orgId)
 * if (isLoading) return <Loading />
 * if (error) return <Error message={error.message} />
 * return <MemberList members={members} />
 */
export function useMembers(orgId: string, options?: { enabled?: boolean }) {
	const { isSignedIn, isLoaded: userLoaded } = useUser()
	const { getToken } = useAuth()

	const {
		data: members,
		isLoading,
		error,
		refetch,
	} = useQuery<Array<MemberWithProfile>>({
		queryKey: ['organization', orgId, 'members'],
		queryFn: async () => {
			const token = await getToken()
			if (!token) {
				throw new Error('Not authenticated')
			}

			const response = await fetch(`/api/organizations/${orgId}/members`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			if (!response.ok) {
				throw new Error(`Failed to fetch members: ${String(response.status)}`)
			}

			const data = (await response.json()) as unknown
			const validated = membersResponseSchema.parse(data)
			return validated.members
		},
		enabled: options?.enabled ?? (userLoaded && isSignedIn),
	})

	useEffect(() => {
		if (error) {
			captureException(error, {
				context: 'useMembers',
				action: 'fetch_members',
				orgId,
			})
		}
	}, [error, orgId])

	return {
		members: members ?? [],
		isLoading,
		error: error instanceof Error ? error : null,
		refetch,
	}
}
