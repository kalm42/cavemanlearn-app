import { and, eq } from 'drizzle-orm'

import { InsufficientRoleError, hasMinimumRole } from './permissions.ts'

import type { OrgRole } from '@/db/schema.ts'
import { db } from '@/db/index.ts'
import { organizationMembers } from '@/db/schema.ts'

/**
 * ## getUserOrgRole
 *
 * Retrieves a user's role in a specific organization.
 * Returns the role if the user is a member, or null if they are not.
 *
 * Note: This function requires database access and should only be used
 * in server-side code (API routes, server functions).
 *
 * @example
 * const role = await getUserOrgRole('user-uuid', 'org-uuid')
 * if (role) {
 *   console.log(`User has role: ${role}`)
 * }
 */
export async function getUserOrgRole(
	userId: string,
	organizationId: string,
): Promise<OrgRole | null> {
	const results = await db
		.select({ role: organizationMembers.role })
		.from(organizationMembers)
		.where(
			and(
				eq(organizationMembers.userId, userId),
				eq(organizationMembers.organizationId, organizationId),
			),
		)
		.limit(1)

	if (results.length === 0) {
		return null
	}
	return results[0].role
}

/**
 * ## requireOrgRole
 *
 * Verifies that a user has at least the minimum required role in an organization.
 * Throws an InsufficientRoleError if the user doesn't have the required role or
 * is not a member of the organization.
 *
 * Note: This function requires database access and should only be used
 * in server-side code (API routes, server functions).
 *
 * @example
 * await requireOrgRole('user-uuid', 'org-uuid', 'editor')
 * // Continues execution if user has editor role or higher
 *
 * @example
 * try {
 *   await requireOrgRole('user-uuid', 'org-uuid', 'admin')
 * } catch (error) {
 *   if (error instanceof InsufficientRoleError) {
 *     console.log('Access denied')
 *   }
 * }
 */
export async function requireOrgRole(
	userId: string,
	organizationId: string,
	minimumRole: OrgRole,
): Promise<OrgRole> {
	const role = await getUserOrgRole(userId, organizationId)

	if (!role) {
		throw new InsufficientRoleError(minimumRole, null)
	}

	if (!hasMinimumRole(role, minimumRole)) {
		throw new InsufficientRoleError(minimumRole, role)
	}

	return role
}
