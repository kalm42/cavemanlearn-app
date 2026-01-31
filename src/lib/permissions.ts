import type { OrgRole } from '@/db/schema.ts'
import { ORG_ROLES } from '@/db/schema.ts'

/**
 * Role hierarchy from highest to lowest privilege.
 * Index 0 is the highest privilege (owner), index 4 is the lowest (viewer).
 */
const ROLE_HIERARCHY = ORG_ROLES

/**
 * ## getRoleIndex
 *
 * Returns the hierarchy index of a role. Lower index means higher privilege.
 * Returns -1 if the role is not found in the hierarchy.
 *
 * @example
 * getRoleIndex('owner') // 0
 * getRoleIndex('viewer') // 4
 */
function getRoleIndex(role: OrgRole): number {
	return ROLE_HIERARCHY.indexOf(role)
}

/**
 * ## hasMinimumRole
 *
 * Checks if a role meets or exceeds the minimum required role in the hierarchy.
 * A lower index in ROLE_HIERARCHY means higher privilege.
 *
 * @example
 * hasMinimumRole('admin', 'editor') // true (admin >= editor)
 * hasMinimumRole('viewer', 'writer') // false (viewer < writer)
 */
export function hasMinimumRole(role: OrgRole, minimumRole: OrgRole): boolean {
	const roleIndex = getRoleIndex(role)
	const minIndex = getRoleIndex(minimumRole)
	return roleIndex <= minIndex
}

/**
 * ## canEditDeck
 *
 * Checks if a role has permission to edit decks.
 * Allowed roles: owner, admin, editor, writer
 *
 * @example
 * canEditDeck('writer') // true
 * canEditDeck('viewer') // false
 */
export function canEditDeck(role: OrgRole): boolean {
	return hasMinimumRole(role, 'writer')
}

/**
 * ## canPublishDeck
 *
 * Checks if a role has permission to publish decks.
 * Allowed roles: owner, admin, editor
 *
 * @example
 * canPublishDeck('editor') // true
 * canPublishDeck('writer') // false
 */
export function canPublishDeck(role: OrgRole): boolean {
	return hasMinimumRole(role, 'editor')
}

/**
 * ## canApproveQuestion
 *
 * Checks if a role has permission to approve questions.
 * Allowed roles: owner, admin, editor
 *
 * @example
 * canApproveQuestion('admin') // true
 * canApproveQuestion('writer') // false
 */
export function canApproveQuestion(role: OrgRole): boolean {
	return hasMinimumRole(role, 'editor')
}

/**
 * ## canManageMembers
 *
 * Checks if a role has permission to manage organization members.
 * Allowed roles: owner, admin
 *
 * @example
 * canManageMembers('admin') // true
 * canManageMembers('editor') // false
 */
export function canManageMembers(role: OrgRole): boolean {
	return hasMinimumRole(role, 'admin')
}

/**
 * ## canManageBilling
 *
 * Checks if a role has permission to manage organization billing.
 * Allowed roles: owner only
 *
 * @example
 * canManageBilling('owner') // true
 * canManageBilling('admin') // false
 */
export function canManageBilling(role: OrgRole): boolean {
	return role === 'owner'
}

/**
 * ## canDeleteOrganization
 *
 * Checks if a role has permission to delete the organization.
 * Allowed roles: owner only
 *
 * @example
 * canDeleteOrganization('owner') // true
 * canDeleteOrganization('admin') // false
 */
export function canDeleteOrganization(role: OrgRole): boolean {
	return role === 'owner'
}

export class InsufficientRoleError extends Error {
	constructor(
		public requiredRole: OrgRole,
		public actualRole: OrgRole | null,
	) {
		super(
			actualRole
				? `Insufficient role: requires ${requiredRole}, has ${actualRole}`
				: `User is not a member of this organization`,
		)
		this.name = 'InsufficientRoleError'
	}
}
