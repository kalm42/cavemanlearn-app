import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { Webhook } from 'svix'
import { z } from 'zod'

import { db } from '@/db/index.ts'
import { userProfiles } from '@/db/schema.ts'
import { insertUserProfileSchema } from '@/db/validators.ts'
import { env } from '@/env'

const clerkUserSchema = z.object({
	id: z.string(),
	email_addresses: z.array(
		z.object({
			id: z.string(),
			email_address: z.email(),
		}),
	),
	primary_email_address_id: z.string().nullable(),
	image_url: z.string().nullable().default(null),
	first_name: z.string().nullable().optional(),
	last_name: z.string().nullable().optional(),
})

const webhookEventSchema = z.object({
	data: clerkUserSchema,
	type: z.string(),
})

type ClerkUser = z.infer<typeof clerkUserSchema>

type ProfileUpdate = {
	email?: string
	avatarUrl?: string | null
	displayName?: string | null
	updatedAt: Date
}

/**
 * ## getPrimaryEmail
 *
 * Extracts the primary email address from a Clerk user object.
 * Returns the email matching primary_email_address_id, or the first email if no primary is set.
 *
 * @example
 * const email = getPrimaryEmail(clerkUser)
 */
function getPrimaryEmail(user: ClerkUser): string | null {
	if (user.email_addresses.length === 0) {
		return null
	}

	if (user.primary_email_address_id) {
		const primaryEmail = user.email_addresses.find((e) => e.id === user.primary_email_address_id)
		if (primaryEmail) {
			return primaryEmail.email_address
		}
	}

	return user.email_addresses[0]?.email_address ?? null
}

/**
 * ## getDisplayName
 *
 * Constructs a display name from Clerk user's first and last name.
 * Returns null if neither name is available.
 *
 * @example
 * const name = getDisplayName(clerkUser)
 */
function getDisplayName(user: ClerkUser): string | null {
	const parts = [user.first_name, user.last_name].filter(Boolean)
	return parts.length > 0 ? parts.join(' ') : null
}

/**
 * ## verifyWebhookSignature
 *
 * Verifies the Svix webhook signature from Clerk.
 * Returns the parsed event payload if valid, or null if verification fails.
 *
 * @example
 * const event = await verifyWebhookSignature(request)
 */
async function verifyWebhookSignature(
	request: Request,
): Promise<z.infer<typeof webhookEventSchema> | null> {
	const webhookSecret = env.CLERK_WEBHOOK_SECRET
	if (!webhookSecret) {
		console.error('CLERK_WEBHOOK_SECRET is not configured')
		return null
	}

	const svixId = request.headers.get('svix-id')
	const svixTimestamp = request.headers.get('svix-timestamp')
	const svixSignature = request.headers.get('svix-signature')

	if (!svixId || !svixTimestamp || !svixSignature) {
		console.error('Missing Svix headers')
		return null
	}

	const body = await request.text()

	try {
		const wh = new Webhook(webhookSecret)
		const payload = wh.verify(body, {
			'svix-id': svixId,
			'svix-timestamp': svixTimestamp,
			'svix-signature': svixSignature,
		})

		const result = webhookEventSchema.safeParse(payload)
		if (!result.success) {
			console.error('Invalid webhook payload:', result.error)
			return null
		}

		return result.data
	} catch (error) {
		console.error('Webhook signature verification failed:', error)
		return null
	}
}

/**
 * ## handleUserCreated
 *
 * Handles the user.created webhook event from Clerk.
 * Creates a new user profile if one doesn't already exist.
 *
 * @example
 * await handleUserCreated(clerkUser)
 */
async function handleUserCreated(user: ClerkUser): Promise<void> {
	const email = getPrimaryEmail(user)
	if (!email) {
		console.error('No email address found for user:', user.id)
		return
	}

	// Check if profile already exists
	const existingProfile = await db
		.select()
		.from(userProfiles)
		.where(eq(userProfiles.clerkId, user.id))
		.limit(1)

	if (existingProfile.length > 0) {
		return
	}

	const insertData = insertUserProfileSchema.parse({
		clerkId: user.id,
		email,
		displayName: getDisplayName(user),
		avatarUrl: user.image_url ?? null,
		userType: 'learner',
	})

	try {
		await db.insert(userProfiles).values(insertData)
	} catch (error) {
		// Handle unique constraint violation (race condition where two webhooks fire simultaneously)
		// PostgreSQL error code 23505 = unique_violation
		const { success, data: postgresError } = z.object({ code: z.string() }).loose().safeParse(error)
		if (success && postgresError.code === '23505') {
			// Profile was created by another concurrent request, which is fine
			return
		}
		// Re-throw other errors
		throw error
	}
}

/**
 * ## handleUserUpdated
 *
 * Handles the user.updated webhook event from Clerk.
 * Updates the user profile's email and avatar if they have changed.
 *
 * @example
 * await handleUserUpdated(clerkUser)
 */
async function handleUserUpdated(user: ClerkUser): Promise<void> {
	const email = getPrimaryEmail(user)
	if (!email) {
		console.error('No email address found for user:', user.id)
		return
	}

	const existingProfiles = await db
		.select()
		.from(userProfiles)
		.where(eq(userProfiles.clerkId, user.id))
		.limit(1)

	if (existingProfiles.length === 0) {
		// Profile doesn't exist, create it
		await handleUserCreated(user)
		return
	}

	const existingProfile = existingProfiles[0]

	// Only update if email, avatar, or displayName has changed
	const updates: ProfileUpdate = {
		updatedAt: new Date(),
	}

	if (existingProfile.email !== email) {
		updates.email = email
	}

	const newAvatarUrl = user.image_url ?? null
	if (existingProfile.avatarUrl !== newAvatarUrl) {
		updates.avatarUrl = newAvatarUrl
	}

	const newDisplayName = getDisplayName(user)
	if (existingProfile.displayName !== newDisplayName) {
		updates.displayName = newDisplayName
	}

	// Only update if there are changes besides updatedAt
	if (Object.keys(updates).length > 1) {
		await db.update(userProfiles).set(updates).where(eq(userProfiles.clerkId, user.id))
	}
}

/**
 * ## handleUserDeleted
 *
 * Handles the user.deleted webhook event from Clerk.
 * Deletes the user profile from the database.
 *
 * @example
 * await handleUserDeleted(clerkUser)
 */
async function handleUserDeleted(user: ClerkUser): Promise<void> {
	const result = await db.delete(userProfiles).where(eq(userProfiles.clerkId, user.id)).returning()

	if (result.length > 0) {
		console.info('User profile deleted:', user.id)
	}
}

/**
 * ## handleClerkWebhook
 *
 * Handles incoming Clerk webhook events. Verifies the webhook signature,
 * then routes to the appropriate handler based on event type.
 * Supports user.created, user.updated, and user.deleted events.
 *
 * @example
 * const response = await handleClerkWebhook(request)
 */
export async function handleClerkWebhook(request: Request): Promise<Response> {
	const event = await verifyWebhookSignature(request)
	if (!event) {
		return Response.json({ error: 'Invalid webhook signature' }, { status: 401 })
	}

	try {
		switch (event.type) {
			case 'user.created':
				await handleUserCreated(event.data)
				break
			case 'user.updated':
				await handleUserUpdated(event.data)
				break
			case 'user.deleted':
				await handleUserDeleted(event.data)
				break
			default:
				// Ignore unknown events
				break
		}

		return Response.json({ received: true })
	} catch (error) {
		console.error('Error processing webhook:', error)
		return Response.json({ error: 'Internal server error' }, { status: 500 })
	}
}

export const Route = createFileRoute('/api/webhooks/clerk')({
	server: {
		handlers: {
			POST: ({ request }) => handleClerkWebhook(request),
		},
	},
})
