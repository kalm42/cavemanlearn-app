import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import type { MemberWithProfile, NonOwnerRole } from '@/lib/validation/organization-members'
import { memberWithProfileSchema } from '@/lib/validation/organization-members'
import { captureException } from '@/integrations/posthog'
import { ApiError, errorResponseSchema } from '@/lib/errors'

const updateMemberRoleResponseSchema = z.object({
	member: memberWithProfileSchema,
})

type UpdateMemberRoleResponse = z.infer<typeof updateMemberRoleResponseSchema>

type UpdateMemberRoleInput = {
	memberId: string
	role: NonOwnerRole
}

/**
 * ## useUpdateMemberRole
 *
 * Custom hook to update a member's role in an organization. Uses TanStack Query's useMutation
 * to handle the PUT request. Automatically handles authentication, validates the response,
 * invalidates the members cache on success, and reports errors to PostHog.
 *
 * @example
 * const updateRole = useUpdateMemberRole(orgId, {
 *   onSuccess: () => {
 *     toast.success('Role updated successfully')
 *   }
 * })
 *
 * const handleRoleChange = (memberId: string, newRole: NonOwnerRole) => {
 *   updateRole.mutate({ memberId, role: newRole })
 * }
 */
export function useUpdateMemberRole(
	orgId: string,
	options?: {
		onSuccess?: (data: MemberWithProfile) => void
		onError?: (error: ApiError) => void
	},
) {
	const { getToken } = useAuth()
	const queryClient = useQueryClient()

	const mutation = useMutation<UpdateMemberRoleResponse, ApiError, UpdateMemberRoleInput>({
		mutationFn: async (data) => {
			const { memberId, role } = data
			const token = await getToken()
			if (!token) {
				throw new ApiError('NOT_AUTHENTICATED')
			}

			const response = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ role }),
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
			return updateMemberRoleResponseSchema.parse(responseData)
		},
		onSuccess: (data) => {
			void queryClient.invalidateQueries({ queryKey: ['organization', orgId, 'members'] })
			options?.onSuccess?.(data.member)
		},
		onError: (error) => {
			captureException(error, {
				context: 'useUpdateMemberRole',
				action: 'update_member_role',
				orgId,
			})
			options?.onError?.(error)
		},
	})

	return mutation
}
