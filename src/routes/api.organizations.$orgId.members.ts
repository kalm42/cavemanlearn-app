import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'

import { db } from '@/db/index.ts'
import { organizationMembers, userProfiles } from '@/db/schema.ts'
import { captureServerException } from '@/integrations/posthog'
import { getCurrentUser, getUserProfile } from '@/lib/auth.ts'
import { canManageMembers, getUserOrgRole } from '@/lib/permissions.ts'
import { validateUuid } from '@/lib/validation/common.ts'
import {
	addMemberRequestSchema,
	memberWithProfileSchema,
} from '@/lib/validation/organization-members.ts'

/**
 * ## handleGetMembers
 *
 * Handles GET requests to list all members of an organization. Verifies that
 * the current user is a member of the organization before returning the list.
 * Returns members with their profile information (email, displayName, avatarUrl).
 *
 * @example
 * const response = await handleGetMembers(request, 'org-uuid')
 * const { members } = await response.json()
 */
export async function handleGetMembers(request: Request, orgId: string): Promise<Response> {
	const validationError = validateUuid(orgId)
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

		// Verify user is a member (also returns 403 for non-existent orgs to avoid leaking existence)
		const role = await getUserOrgRole(profile.id, orgId)
		if (!role) {
			return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
		}

		// Get all members with their profiles
		const membersWithProfiles = await db
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
			.where(eq(organizationMembers.organizationId, orgId))

		// Validate and return members
		const validatedMembers = membersWithProfiles.map((member) =>
			memberWithProfileSchema.parse(member),
		)

		return Response.json({ members: validatedMembers })
	} catch (error) {
		captureServerException(error, {
			context: 'handleGetMembers',
			orgId,
		})
		return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
	}
}

/**
 * ## handleAddMember
 *
 * Handles POST requests to add a new member to an organization. Requires the
 * current user to have admin or higher role. Validates that the email exists
 * in the system and that the role is not 'owner'. Returns 409 if the user is
 * already a member.
 *
 * @example
 * const response = await handleAddMember(request, 'org-uuid')
 * const { member } = await response.json()
 */
export async function handleAddMember(request: Request, orgId: string): Promise<Response> {
	const validationError = validateUuid(orgId)
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
		const bodyResult = addMemberRequestSchema.safeParse(body)
		if (!bodyResult.success) {
			return Response.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
		}

		// Find user by email
		const targetUserResults = await db
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.email, bodyResult.data.email))
			.limit(1)

		const targetUser = targetUserResults.at(0)
		if (!targetUser) {
			return Response.json({ error: { code: 'USER_NOT_FOUND' } }, { status: 404 })
		}

		// Check if user is already a member
		const existingMemberResults = await db
			.select({ id: organizationMembers.id })
			.from(organizationMembers)
			.where(
				and(
					eq(organizationMembers.organizationId, orgId),
					eq(organizationMembers.userId, targetUser.id),
				),
			)
			.limit(1)

		if (existingMemberResults.length > 0) {
			return Response.json({ error: { code: 'ALREADY_MEMBER' } }, { status: 409 })
		}

		// Add member
		const [newMember] = await db
			.insert(organizationMembers)
			.values({
				organizationId: orgId,
				userId: targetUser.id,
				role: bodyResult.data.role,
			})
			.returning()

		// Return member with profile
		const memberWithProfile = memberWithProfileSchema.parse({
			...newMember,
			profile: {
				id: targetUser.id,
				email: targetUser.email,
				displayName: targetUser.displayName,
				avatarUrl: targetUser.avatarUrl,
			},
		})

		return Response.json({ member: memberWithProfile }, { status: 201 })
	} catch (error) {
		captureServerException(error, {
			context: 'handleAddMember',
			orgId,
		})
		return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
	}
}

export const Route = createFileRoute('/api/organizations/$orgId/members')({
	server: {
		handlers: {
			GET: ({ request, params }) => handleGetMembers(request, params.orgId),
			POST: ({ request, params }) => handleAddMember(request, params.orgId),
		},
	},
})
