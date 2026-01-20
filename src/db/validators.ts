import { z } from 'zod'

import type { UserProfile } from './schema.ts'

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
