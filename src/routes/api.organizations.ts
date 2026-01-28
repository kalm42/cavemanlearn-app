import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db/index.ts'
import { organizationMembers, organizations } from '@/db/schema.ts'
import {
	insertOrganizationMemberSchema,
	insertOrganizationSchema,
	orgRoleSchema,
	organizationMemberSchema,
	organizationSchema,
} from '@/db/validators.ts'
import { getCurrentUser, getUserProfile } from '@/lib/auth.ts'
import { generateUniqueSlug } from '@/lib/slug.ts'
import { createOrganizationRequestSchema } from '@/lib/validation/organization.ts'

/**
 * ## organizationWithRoleSchema
 *
 * Zod schema for validating organization data with the user's role included.
 * Extends the base organization schema with a role field.
 */
const organizationWithRoleSchema = organizationSchema.extend({
	role: orgRoleSchema,
})

/**
 * ## handleGetOrganizations
 *
 * Handles GET requests to list all organizations where the current user is a member.
 * Returns organizations with the user's role in each, ordered by name. Returns 401
 * if unauthenticated, 404 if user profile not found, or 200 with the organizations list.
 *
 * @example
 * const response = await handleGetOrganizations(request)
 * const { organizations } = await response.json()
 */
export async function handleGetOrganizations(request: Request): Promise<Response> {
	const user = await getCurrentUser(request)
	if (!user) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const profile = await getUserProfile(user.userId)
	if (!profile) {
		return Response.json({ error: 'Profile not found' }, { status: 404 })
	}

	// Get all organizations where the user is a member, with their role
	const results = await db
		.select({
			id: organizations.id,
			name: organizations.name,
			slug: organizations.slug,
			description: organizations.description,
			logoUrl: organizations.logoUrl,
			createdAt: organizations.createdAt,
			updatedAt: organizations.updatedAt,
			role: organizationMembers.role,
		})
		.from(organizationMembers)
		.innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
		.where(eq(organizationMembers.userId, profile.id))
		.orderBy(organizations.name)

	// Validate each organization with role
	const validatedOrganizations = results.map((org) => organizationWithRoleSchema.parse(org))

	return Response.json({ organizations: validatedOrganizations })
}

/**
 * ## handleCreateOrganization
 *
 * Handles POST requests to create a new organization. Validates the request body,
 * generates a unique slug from the name, creates the organization, and adds the
 * current user as the owner. Returns 401 if unauthenticated, 400 if validation fails,
 * 404 if user profile not found, or 201 with the created organization.
 *
 * @example
 * const response = await handleCreateOrganization(request)
 * const { organization, membership } = await response.json()
 */
export async function handleCreateOrganization(request: Request): Promise<Response> {
	const user = await getCurrentUser(request)
	if (!user) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const profile = await getUserProfile(user.userId)
	if (!profile) {
		return Response.json({ error: 'Profile not found' }, { status: 404 })
	}

	// Parse request body
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
	}

	// Validate request body
	const bodyResult = createOrganizationRequestSchema.safeParse(body)
	if (!bodyResult.success) {
		const errorMessage = bodyResult.error.issues[0]?.message ?? 'Invalid request body'
		return Response.json({ error: errorMessage }, { status: 400 })
	}

	// Generate unique slug
	const slug = await generateUniqueSlug(bodyResult.data.name)

	// Validate insert data
	const insertData = insertOrganizationSchema.parse({
		name: bodyResult.data.name,
		slug,
		description: bodyResult.data.description ?? null,
	})

	try {
		// Create organization and add owner in a transaction
		const result = await db.transaction(async (tx) => {
			// Create organization
			const [newOrganization] = await tx.insert(organizations).values(insertData).returning()

			// Validate the returned organization
			const validatedOrganization = organizationSchema.parse(newOrganization)

			// Add current user as owner
			const memberInsertData = insertOrganizationMemberSchema.parse({
				organizationId: validatedOrganization.id,
				userId: profile.id,
				role: 'owner',
			})

			const [newMembership] = await tx
				.insert(organizationMembers)
				.values(memberInsertData)
				.returning()

			// Validate the returned membership
			const validatedMembership = organizationMemberSchema.parse(newMembership)

			return {
				organization: validatedOrganization,
				membership: validatedMembership,
			}
		})

		return Response.json(result, { status: 201 })
	} catch (error) {
		const { success, data: postgresError } = z.object({ code: z.string() }).loose().safeParse(error)
		// Handle unique constraint violation (race condition)
		// PostgreSQL error code 23505 = unique_violation
		if (success && postgresError.code === '23505') {
			return Response.json({ error: 'Organization with this name already exists' }, { status: 409 })
		}
		// Re-throw other errors
		throw error
	}
}

export const Route = createFileRoute('/api/organizations')({
	server: {
		handlers: {
			GET: ({ request }) => handleGetOrganizations(request),
			POST: ({ request }) => handleCreateOrganization(request),
		},
	},
})
