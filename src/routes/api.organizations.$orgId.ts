import { createFileRoute } from '@tanstack/react-router'
import { count, eq } from 'drizzle-orm'
import { z } from 'zod'

import { db } from '@/db/index.ts'
import { organizationMembers, organizations } from '@/db/schema.ts'
import { organizationSchema } from '@/db/validators.ts'
import { getCurrentUser, getUserProfile } from '@/lib/auth.ts'
import { canDeleteOrganization, getUserOrgRole, hasMinimumRole } from '@/lib/permissions.ts'
import { generateUniqueSlug } from '@/lib/slug.ts'
import { validateUuid } from '@/lib/validation/common.ts'
import { updateOrganizationRequestSchema } from '@/lib/validation/organization.ts'

/**
 * ## organizationWithMemberCountSchema
 *
 * Zod schema for validating organization data with member count included.
 * Extends the base organization schema with a memberCount field.
 */
const organizationWithMemberCountSchema = organizationSchema.extend({
	memberCount: z.number(),
})

/**
 * ## handleGetOrganization
 *
 * Handles GET requests to retrieve a single organization by ID. Verifies that
 * the current user is a member of the organization before returning the details.
 * Returns 400 if orgId is invalid, 401 if unauthenticated, 404 if user profile
 * not found, 403 if user is not a member or organization does not exist (to avoid
 * leaking organization existence), or 200 with the organization details including
 * member count.
 *
 * @example
 * const response = await handleGetOrganization(request, 'org-uuid')
 * const { organization } = await response.json()
 */
export async function handleGetOrganization(request: Request, orgId: string): Promise<Response> {
	const validationError = validateUuid(orgId)
	if (validationError) return validationError

	const user = await getCurrentUser(request)
	if (!user) {
		return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
	}

	const profile = await getUserProfile(user.userId)
	if (!profile) {
		return Response.json({ error: { code: 'PROFILE_NOT_FOUND' } }, { status: 404 })
	}

	// Verify user is a member (also returns 403 for non-existent orgs to avoid leaking existence)
	const role = await getUserOrgRole(profile.id, orgId)
	if (!role) {
		return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
	}

	// Get the organization
	const organizationResults = await db
		.select()
		.from(organizations)
		.where(eq(organizations.id, orgId))
		.limit(1)

	const organization = organizationResults.at(0)
	if (!organization) {
		return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
	}

	// Get member count
	const memberCountResults = await db
		.select({ count: count() })
		.from(organizationMembers)
		.where(eq(organizationMembers.organizationId, orgId))

	const memberCount = memberCountResults.at(0)?.count ?? 0

	// Validate and return organization with member count
	const validatedOrganization = organizationWithMemberCountSchema.parse({
		...organization,
		memberCount,
	})

	return Response.json({ organization: validatedOrganization })
}

/**
 * ## handleUpdateOrganization
 *
 * Handles PUT requests to update an organization. Verifies that the current user
 * has admin or higher role in the organization. If the name is changed, a new unique
 * slug is generated. Returns 400 if orgId is invalid or body validation fails, 401 if
 * unauthenticated, 404 if user profile not found, 403 if user lacks permission or
 * organization does not exist (to avoid leaking organization existence), or 200 with
 * the updated organization.
 *
 * @example
 * const response = await handleUpdateOrganization(request, 'org-uuid')
 * const { organization } = await response.json()
 */
export async function handleUpdateOrganization(request: Request, orgId: string): Promise<Response> {
	const validationError = validateUuid(orgId)
	if (validationError) return validationError

	const user = await getCurrentUser(request)
	if (!user) {
		return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
	}

	const profile = await getUserProfile(user.userId)
	if (!profile) {
		return Response.json({ error: { code: 'PROFILE_NOT_FOUND' } }, { status: 404 })
	}

	// Verify user has admin+ role (also returns 403 for non-existent orgs to avoid leaking existence)
	const role = await getUserOrgRole(profile.id, orgId)
	if (!role || !hasMinimumRole(role, 'admin')) {
		return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
	}

	// Parse request body
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return Response.json({ error: { code: 'INVALID_JSON' } }, { status: 400 })
	}

	// Validate request body
	const bodyResult = updateOrganizationRequestSchema.safeParse(body)
	if (!bodyResult.success) {
		return Response.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
	}

	// Get the existing organization
	const existingOrgResults = await db
		.select()
		.from(organizations)
		.where(eq(organizations.id, orgId))
		.limit(1)

	const existingOrg = existingOrgResults.at(0)
	if (!existingOrg) {
		return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
	}

	// Prepare update data
	const updateData: {
		name?: string
		slug?: string
		description?: string | null
		logoUrl?: string | null
		updatedAt: Date
	} = {
		updatedAt: new Date(),
	}

	// If name is being changed, regenerate slug
	if (bodyResult.data.name !== undefined && bodyResult.data.name !== existingOrg.name) {
		updateData.name = bodyResult.data.name
		updateData.slug = await generateUniqueSlug(bodyResult.data.name)
	}

	// Handle description (can be null, undefined means don't update)
	if (bodyResult.data.description !== undefined) {
		updateData.description = bodyResult.data.description ?? null
	}

	// Handle logoUrl (can be null, undefined means don't update)
	if (bodyResult.data.logoUrl !== undefined) {
		updateData.logoUrl = bodyResult.data.logoUrl ?? null
	}

	// Update the organization
	const [updatedOrganization] = await db
		.update(organizations)
		.set(updateData)
		.where(eq(organizations.id, orgId))
		.returning()

	// Validate and return updated organization
	const validatedOrganization = organizationSchema.parse(updatedOrganization)

	return Response.json({ organization: validatedOrganization })
}

/**
 * ## handleDeleteOrganization
 *
 * Handles DELETE requests to delete an organization. Only the owner can delete
 * an organization. The deletion cascades to remove all organization members.
 * Returns 400 if orgId is invalid, 401 if unauthenticated, 404 if user profile
 * not found, 403 if user is not the owner or organization does not exist (to avoid
 * leaking organization existence), or 204 with no content on success.
 *
 * @example
 * const response = await handleDeleteOrganization(request, 'org-uuid')
 * // response.status === 204
 */
export async function handleDeleteOrganization(request: Request, orgId: string): Promise<Response> {
	const validationError = validateUuid(orgId)
	if (validationError) return validationError

	const user = await getCurrentUser(request)
	if (!user) {
		return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
	}

	const profile = await getUserProfile(user.userId)
	if (!profile) {
		return Response.json({ error: { code: 'PROFILE_NOT_FOUND' } }, { status: 404 })
	}

	// Verify user is the owner (also returns 403 for non-existent orgs to avoid leaking existence)
	const role = await getUserOrgRole(profile.id, orgId)
	if (!role || !canDeleteOrganization(role)) {
		return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
	}

	// Verify organization exists
	const existingOrgResults = await db
		.select({ id: organizations.id })
		.from(organizations)
		.where(eq(organizations.id, orgId))
		.limit(1)

	const existingOrg = existingOrgResults.at(0)
	if (!existingOrg) {
		return Response.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
	}

	// Delete the organization (cascades to members due to foreign key)
	await db.delete(organizations).where(eq(organizations.id, orgId))

	return new Response(null, { status: 204 })
}

export const Route = createFileRoute('/api/organizations/$orgId')({
	server: {
		handlers: {
			GET: ({ request, params }) => handleGetOrganization(request, params.orgId),
			PUT: ({ request, params }) => handleUpdateOrganization(request, params.orgId),
			DELETE: ({ request, params }) => handleDeleteOrganization(request, params.orgId),
		},
	},
})
