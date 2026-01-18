import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { db } from '@/db/index.ts'
import { userProfiles } from '@/db/schema.ts'
import {
	createProfileRequestSchema,
	insertUserProfileSchema,
	userProfileSchema,
} from '@/db/validators.ts'
import { getCurrentUser, getUserProfile } from '@/lib/auth.ts'

/**
 * ## handleGetProfile
 *
 * Handles GET requests to retrieve the current user's profile. Authenticates the request,
 * fetches the user's profile from the database, validates it with Zod, and returns it as JSON.
 * Returns 401 if unauthenticated, 404 if profile not found, or 200 with the profile data.
 *
 * @example
 * const response = await handleGetProfile(request)
 * const profile = await response.json()
 */
export async function handleGetProfile(request: Request): Promise<Response> {
	const user = await getCurrentUser(request)
	if (!user) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const profile = await getUserProfile(user.userId)
	if (!profile) {
		return Response.json({ error: 'Profile not found' }, { status: 404 })
	}

	// Validate the profile from the database
	const validatedProfile = userProfileSchema.parse(profile)

	return Response.json(validatedProfile)
}

/**
 * ## handleCreateProfile
 *
 * Handles POST requests to create a new user profile. Authenticates the request, validates
 * the request body for userType, checks for existing profile, creates a new profile in the
 * database, validates the result with Zod, and returns it as JSON. Returns 401 if unauthenticated,
 * 400 if validation fails, 409 if profile already exists, or 201 with the created profile.
 *
 * @example
 * const response = await handleCreateProfile(request)
 * const profile = await response.json()
 */
export async function handleCreateProfile(request: Request): Promise<Response> {
	const user = await getCurrentUser(request)
	if (!user) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	// Validate request body with Zod
	const bodyResult = createProfileRequestSchema.safeParse(await request.json())
	if (!bodyResult.success) {
		return Response.json(
			{ error: 'Invalid userType. Must be "learner" or "publisher"' },
			{ status: 400 },
		)
	}

	const existingProfile = await getUserProfile(user.userId)
	if (existingProfile) {
		return Response.json({ error: 'Profile already exists' }, { status: 409 })
	}

	// Validate insert data with Zod
	const insertData = insertUserProfileSchema.parse({
		clerkId: user.userId,
		email: user.email,
		userType: bodyResult.data.userType,
	})

	try {
		const [newProfile] = await db.insert(userProfiles).values(insertData).returning()

		// Validate the returned profile from the database
		const validatedProfile = userProfileSchema.parse(newProfile)

		return Response.json(validatedProfile, { status: 201 })
	} catch (error) {
		const { success, data: postgresError } = z.object({ code: z.string() }).loose().safeParse(error)
		// Handle unique constraint violation (race condition or direct DB insert)
		// PostgreSQL error code 23505 = unique_violation
		if (success && postgresError.code === '23505') {
			return Response.json({ error: 'Profile already exists' }, { status: 409 })
		}
		// Re-throw other errors
		throw error
	}
}

export const Route = createFileRoute('/api/user/profile')({
	server: {
		handlers: {
			GET: ({ request }) => handleGetProfile(request),
			POST: ({ request }) => handleCreateProfile(request),
		},
	},
})
