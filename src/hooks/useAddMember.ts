import { useAuth } from '@clerk/clerk-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import type { AddMemberRequest, MemberWithProfile } from '@/lib/validation/organization-members'
import { memberWithProfileSchema } from '@/lib/validation/organization-members'
import { captureException } from '@/integrations/posthog'
import { ApiError, errorResponseSchema } from '@/lib/errors'

const addMemberResponseSchema = z.object({
	member: memberWithProfileSchema,
})

type AddMemberResponse = z.infer<typeof addMemberResponseSchema>

/**
 * ## useAddMember
 *
 * Custom hook to add a new member to an organization. Uses TanStack Query's useMutation
 * to handle the POST request. Automatically handles authentication, validates the response,
 * invalidates the members cache on success, and reports errors to PostHog.
 *
 * @example
 * const addMember = useAddMember(orgId, {
 *   onSuccess: (data) => {
 *     toast.success('Member added successfully')
 *   }
 * })
 *
 * const handleAddMember = (email: string, role: NonOwnerRole) => {
 *   addMember.mutate({ email, role })
 * }
 */
export function useAddMember(
	orgId: string,
	options?: {
		onSuccess?: (data: MemberWithProfile) => void
		onError?: (error: ApiError) => void
	},
) {
	const { getToken } = useAuth()
	const queryClient = useQueryClient()

	const mutation = useMutation<AddMemberResponse, ApiError, AddMemberRequest>({
		mutationFn: async (data) => {
			const token = await getToken()
			if (!token) {
				throw new ApiError('NOT_AUTHENTICATED')
			}

			const response = await fetch(`/api/organizations/${orgId}/members`, {
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
			return addMemberResponseSchema.parse(responseData)
		},
		onSuccess: (data) => {
			void queryClient.invalidateQueries({ queryKey: ['organization', orgId, 'members'] })
			void queryClient.invalidateQueries({ queryKey: ['organization', orgId] })
			options?.onSuccess?.(data.member)
		},
		onError: (error) => {
			captureException(error, {
				context: 'useAddMember',
				action: 'add_member',
				orgId,
			})
			options?.onError?.(error)
		},
	})

	return mutation
}
