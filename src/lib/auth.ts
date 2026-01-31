import { eq } from 'drizzle-orm'
import { z } from 'zod'

import type { UserProfile } from '@/db/schema.ts'
import { db } from '@/db/index.ts'
import { userProfiles } from '@/db/schema.ts'

export type ClerkUser = {
	userId: string
	email: string
}

/**
 * ## getCurrentUser
 *
 * Extracts and validates the current user from the Authorization header of a request.
 * Verifies the Bearer token using Clerk's backend SDK and returns the user's ID and email
 * if the token is valid. Returns null if authentication fails or the token is invalid.
 *
 * Note: Uses dynamic import for @clerk/backend to prevent it from being bundled
 * into the client-side code. This is necessary because TanStack Router's route
 * tree imports all routes including API routes, which would otherwise pull
 * Node.js-only dependencies into the browser bundle.
 *
 * @example
 * const user = await getCurrentUser(request)
 * if (user) {
 *   console.log(`Authenticated as ${user.email}`)
 * }
 */
export async function getCurrentUser(request: Request): Promise<ClerkUser | null> {
	const authHeader = request.headers.get('Authorization')
	if (!authHeader?.startsWith('Bearer ')) {
		return null
	}

	const token = authHeader.slice(7)
	if (!token) {
		return null
	}

	const secretKey = process.env.CLERK_SECRET_KEY
	if (!secretKey) {
		return null
	}

	try {
		// Dynamic import to prevent @clerk/backend from being bundled into client code
		const { verifyToken } = await import('@clerk/backend')
		const payload = await verifyToken(token, { secretKey })
		const userId = payload.sub

		if (!userId) {
			return null
		}

		// Email may not be in the token - use empty string as fallback
		// The email can be looked up from the user profile if needed
		const email = z.email().optional().parse(payload.email) ?? ''

		return { userId, email }
	} catch {
		return null
	}
}

/**
 * ## getUserProfile
 *
 * Retrieves a user profile from the database by Clerk ID. Returns the profile if found,
 * or null if no profile exists for the given Clerk ID.
 *
 * @example
 * const profile = await getUserProfile('user_123')
 * if (profile) {
 *   console.log(`Found profile: ${profile.displayName}`)
 * }
 */
export async function getUserProfile(clerkId: string): Promise<UserProfile | null> {
	const results = await db
		.select()
		.from(userProfiles)
		.where(eq(userProfiles.clerkId, clerkId))
		.limit(1)

	return results[0] ?? null
}
