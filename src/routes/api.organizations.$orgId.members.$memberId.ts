import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db/index.ts'
import { organizationMembers, userProfiles } from '@/db/schema.ts'
import { captureServerException } from '@/integrations/posthog'
import { getCurrentUser, getUserProfile } from '@/lib/auth.ts'
import { canManageMembers, getUserOrgRole } from '@/lib/permissions.ts'
import { validateUuids } from '@/lib/validation/common.ts'
import {
	memberWithProfileSchema,
	updateMemberRoleRequestSchema,
} from '@/lib/validation/organization-members.ts'

/**
 * ## handleUpdateMemberRole
 *
 * Handles PUT requests to update a member's role in an organization. Requires
 * the current user to have admin or higher role. Cannot change the role of the
 * owner. Returns 400 if trying to set role to 'owner'.
 *
 * @example
 * const response = await handleUpdateMemberRole(request, 'org-uuid', 'member-uuid')
 * const { member } = await response.json()
 */
export async function handleUpdateMemberRole(
	request: Request,
	orgId: string,
	memberId: string,
): Promise<Response> {
	const validationError = validateUuids([orgId, memberId])
	if (validationError) return validationError

	try {
		const user = await getCurrentUser(request)
		if (!user) {
			return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
		}

		const profile = await getUserProfile(user.userId)
		if (!profile) {
			return Response.json({ error: { code: 'PROFILE_NOT_FOUND' } }, { status: 404 })
		}

		// Verify user has admin+ role
		const role = await getUserOrgRole(profile.id, orgId)
		if (!role || !canManageMembers(role)) {
			return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
		}

		// Parse request body
		let body: unknown
		try {
			body = await request.json()
		} catch {
			return Response.json({ error: { code: 'INVALID_JSON' } }, { status: 400 })
		}

		// Validate request body
		const bodyResult = updateMemberRoleRequestSchema.safeParse(body)
		if (!bodyResult.success) {
			return Response.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
		}

		// Get the target member with their profile in a single query
		const memberResults = await db
			.select({
				id: organizationMembers.id,
				organizationId: organizationMembers.organizationId,
				userId: organizationMembers.userId,
				role: organizationMembers.role,
				createdAt: organizationMembers.createdAt,
				profile: {
					id: userProfiles.id,
					email: userProfiles.email,
					displayName: userProfiles.displayName,
					avatarUrl: userProfiles.avatarUrl,
				},
			})
			.from(organizationMembers)
			.innerJoin(userProfiles, eq(organizationMembers.userId, userProfiles.id))
			.where(
				and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, orgId)),
			)
			.limit(1)

		const targetMember = memberResults.at(0)
		if (!targetMember) {
			return Response.json({ error: { code: 'MEMBER_NOT_FOUND' } }, { status: 404 })
		}

		// Cannot change the owner's role
		if (targetMember.role === 'owner') {
			return Response.json({ error: { code: 'CANNOT_MODIFY_OWNER' } }, { status: 403 })
		}

		// Update the member's role
		const [updatedMember] = await db
			.update(organizationMembers)
			.set({ role: bodyResult.data.role })
			.where(eq(organizationMembers.id, memberId))
			.returning()

		// Return member with profile (use profile from initial query)
		const memberWithProfile = memberWithProfileSchema.parse({
			...updatedMember,
			profile: targetMember.profile,
		})

		return Response.json({ member: memberWithProfile })
	} catch (error) {
		captureServerException(error, {
			context: 'handleUpdateMemberRole',
			orgId,
			memberId,
		})
		return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
	}
}

/**
 * ## handleRemoveMember
 *
 * Handles DELETE requests to remove a member from an organization. Requires
 * the current user to have admin or higher role. Cannot remove the owner.
 * Returns 204 on success.
 *
 * @example
 * const response = await handleRemoveMember(request, 'org-uuid', 'member-uuid')
 * // response.status === 204
 */
export async function handleRemoveMember(
	request: Request,
	orgId: string,
	memberId: string,
): Promise<Response> {
	const validationError = validateUuids([orgId, memberId])
	if (validationError) return validationError

	try {
		const user = await getCurrentUser(request)
		if (!user) {
			return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
		}

		const profile = await getUserProfile(user.userId)
		if (!profile) {
			return Response.json({ error: { code: 'PROFILE_NOT_FOUND' } }, { status: 404 })
		}

		// Verify user has admin+ role
		const role = await getUserOrgRole(profile.id, orgId)
		if (!role || !canManageMembers(role)) {
			return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
		}

		// Get the target member
		const memberResults = await db
			.select({
				id: organizationMembers.id,
				role: organizationMembers.role,
			})
			.from(organizationMembers)
			.where(
				and(eq(organizationMembers.id, memberId), eq(organizationMembers.organizationId, orgId)),
			)
			.limit(1)

		const targetMember = memberResults.at(0)
		if (!targetMember) {
			return Response.json({ error: { code: 'MEMBER_NOT_FOUND' } }, { status: 404 })
		}

		// Cannot remove the owner
		if (targetMember.role === 'owner') {
			return Response.json({ error: { code: 'CANNOT_MODIFY_OWNER' } }, { status: 403 })
		}

		// Remove the member
		await db.delete(organizationMembers).where(eq(organizationMembers.id, memberId))

		return new Response(null, { status: 204 })
	} catch (error) {
		captureServerException(error, {
			context: 'handleRemoveMember',
			orgId,
			memberId,
		})
		return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
	}
}

export const Route = createFileRoute('/api/organizations/$orgId/members/$memberId')({
	server: {
		handlers: {
			PUT: ({ request, params }) => handleUpdateMemberRole(request, params.orgId, params.memberId),
			DELETE: ({ request, params }) => handleRemoveMember(request, params.orgId, params.memberId),
		},
	},
})
