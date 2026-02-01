import { z } from 'zod'

import { NOTIFICATION_TYPES, ORG_ROLES } from './schema.ts'
import type {
	Notification,
	Organization,
	OrganizationMember,
	UserProfile,
} from './schema.ts'

// Zod schemas for database record validation
export const userTypeSchema = z.enum(['learner', 'publisher'])

export const userProfileSchema = z.object({
	id: z.uuid(),
	clerkId: z.string(),
	email: z.email(),
	displayName: z.string().nullable(),
	avatarUrl: z.string().nullable(),
	userType: userTypeSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
}) satisfies z.ZodType<UserProfile>

export const insertUserProfileSchema = z.object({
	clerkId: z.string(),
	email: z.email(),
	displayName: z.string().nullable().optional(),
	avatarUrl: z.string().nullable().optional(),
	userType: userTypeSchema,
})

export const createProfileRequestSchema = z.object({
	userType: userTypeSchema,
})

// Organization schemas
export const orgRoleSchema = z.enum(ORG_ROLES)

export const organizationSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	slug: z.string(),
	description: z.string().nullable(),
	logoUrl: z.string().nullable(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
}) satisfies z.ZodType<Organization>

export const insertOrganizationSchema = z.object({
	name: z.string().min(1),
	slug: z.string().min(1),
	description: z.string().nullable().optional(),
	logoUrl: z.url().nullable().optional(),
})

// Organization member schemas
export const organizationMemberSchema = z.object({
	id: z.uuid(),
	organizationId: z.uuid(),
	userId: z.uuid(),
	role: orgRoleSchema,
	createdAt: z.coerce.date(),
}) satisfies z.ZodType<OrganizationMember>

export const insertOrganizationMemberSchema = z.object({
	organizationId: z.uuid(),
	userId: z.uuid(),
	role: orgRoleSchema,
})

/**
 * ## organizationWithRoleSchema
 *
 * Zod schema for validating organization data with the user's role and member count included.
 * Extends the base organization schema with role and memberCount fields. Used by both the
 * API route and client hooks to ensure consistent validation.
 *
 * @example
 * const validated = organizationWithRoleSchema.parse(orgData)
 * console.log(validated.role, validated.memberCount)
 */
export const organizationWithRoleSchema = organizationSchema.extend({
	role: orgRoleSchema,
	memberCount: z.number(),
})

export type OrganizationWithRole = z.infer<typeof organizationWithRoleSchema>

// Notification schemas
export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES)

export const notificationSchema = z.object({
	id: z.uuid(),
	userId: z.uuid(),
	type: notificationTypeSchema,
	title: z.string(),
	message: z.string(),
	relatedQuestionId: z.uuid().nullable(),
	relatedDeckId: z.uuid().nullable(),
	read: z.boolean(),
	createdAt: z.coerce.date(),
}) satisfies z.ZodType<Notification>

export const insertNotificationSchema = z.object({
	userId: z.uuid(),
	type: notificationTypeSchema,
	title: z.string().min(1),
	message: z.string().min(1),
	relatedQuestionId: z.uuid().nullable().optional(),
	relatedDeckId: z.uuid().nullable().optional(),
	read: z.boolean().optional(),
})
