import { z } from 'zod'

import type { OrgRole } from '@/db/schema.ts'
import { ORG_ROLES } from '@/db/schema.ts'
import { organizationMemberSchema, userProfileSchema } from '@/db/validators.ts'

/**
 * ## NON_OWNER_ROLES
 *
 * Array of organization roles excluding 'owner'. Used for validation when
 * adding or updating members, since owner role cannot be assigned directly.
 * Derived from the database schema to stay in sync.
 */
const NON_OWNER_ROLES = ORG_ROLES.filter(
	(role): role is Exclude<OrgRole, 'owner'> => role !== 'owner',
) as [Exclude<OrgRole, 'owner'>, ...Array<Exclude<OrgRole, 'owner'>>]

/**
 * ## nonOwnerRoleSchema
 *
 * Zod schema for validating organization roles that can be assigned to members.
 * Excludes the 'owner' role since there can only be one owner per organization.
 * Derived from the database schema's ORG_ROLES constant.
 *
 * @example
 * nonOwnerRoleSchema.parse('admin') // 'admin'
 * nonOwnerRoleSchema.parse('owner') // throws ZodError
 */
export const nonOwnerRoleSchema = z.enum(NON_OWNER_ROLES, {
	error: `Role must be ${NON_OWNER_ROLES.join(', ')}`,
})

export type NonOwnerRole = z.infer<typeof nonOwnerRoleSchema>

/**
 * ## addMemberRequestSchema
 *
 * Zod schema for validating requests to add a new member to an organization.
 * Requires a valid email address and a non-owner role.
 *
 * @example
 * const result = addMemberRequestSchema.safeParse({
 *   email: 'newmember@example.com',
 *   role: 'editor'
 * })
 * if (result.success) {
 *   console.log(result.data.email, result.data.role)
 * }
 */
export const addMemberRequestSchema = z.object({
	email: z.email('Invalid email address'),
	role: nonOwnerRoleSchema,
})

export type AddMemberRequest = z.infer<typeof addMemberRequestSchema>

/**
 * ## updateMemberRoleRequestSchema
 *
 * Zod schema for validating requests to update a member's role in an organization.
 * Only allows non-owner roles since owner role cannot be transferred this way.
 *
 * @example
 * const result = updateMemberRoleRequestSchema.safeParse({ role: 'writer' })
 * if (result.success) {
 *   console.log(result.data.role)
 * }
 */
export const updateMemberRoleRequestSchema = z.object({
	role: nonOwnerRoleSchema,
})

export type UpdateMemberRoleRequest = z.infer<typeof updateMemberRoleRequestSchema>

/**
 * ## memberWithProfileSchema
 *
 * Zod schema for validating organization member data with user profile included.
 * Combines the organization member schema with relevant profile fields.
 * Used in API responses that return member data with profile information.
 *
 * @example
 * const validated = memberWithProfileSchema.parse({
 *   id: 'member-uuid',
 *   organizationId: 'org-uuid',
 *   userId: 'user-uuid',
 *   role: 'editor',
 *   createdAt: new Date(),
 *   profile: {
 *     id: 'user-uuid',
 *     email: 'user@example.com',
 *     displayName: 'User Name',
 *     avatarUrl: null,
 *   },
 * })
 */
export const memberWithProfileSchema = organizationMemberSchema.extend({
	profile: userProfileSchema.pick({
		id: true,
		email: true,
		displayName: true,
		avatarUrl: true,
	}),
})

export type MemberWithProfile = z.infer<typeof memberWithProfileSchema>
