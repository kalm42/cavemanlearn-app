import { z } from 'zod'

import { ORG_ROLES } from './schema.ts'
import type { Organization, OrganizationMember, UserProfile } from './schema.ts'

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
