import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { db } from '@/db/index.ts'
import { organizationSettings } from '@/db/schema.ts'
import { organizationSettingsSchema } from '@/db/validators.ts'
import { captureServerException } from '@/integrations/posthog'
import { getCurrentUser, getUserProfile } from '@/lib/auth.ts'
import { hasMinimumRole } from '@/lib/permissions.ts'
import { getUserOrgRole } from '@/lib/permissions.server.ts'
import { validateUuid } from '@/lib/validation/common.ts'
import { updateOrganizationSettingsRequestSchema } from '@/lib/validation/organization-settings.ts'

/**
 * ## handleGetOrganizationSettings
 *
 * Handles GET requests to retrieve organization settings. Verifies that the current user
 * has admin or higher role in the organization. If settings don't exist yet, creates a
 * default record for the organization. Returns 400 if orgId is invalid, 401 if
 * unauthenticated, 404 if user profile not found, 403 if user lacks admin+ permission
 * or organization does not exist, or 200 with the organization settings.
 *
 * @example
 * const response = await handleGetOrganizationSettings(request, 'org-uuid')
 * const { settings } = await response.json()
 */
export async function handleGetOrganizationSettings(
	request: Request,
	orgId: string,
): Promise<Response> {
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

	const role = await getUserOrgRole(profile.id, orgId)
	if (!role || !hasMinimumRole(role, 'admin')) {
		return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
	}

	try {
		const settingsResults = await db
			.select()
			.from(organizationSettings)
			.where(eq(organizationSettings.organizationId, orgId))
			.limit(1)

		let settings = settingsResults.at(0)

		if (!settings) {
			const [createdSettings] = await db
				.insert(organizationSettings)
				.values({ organizationId: orgId })
				.returning()

			settings = createdSettings
		}

		const validatedSettings = organizationSettingsSchema.parse(settings)
		return Response.json({ settings: validatedSettings })
	} catch (error) {
		captureServerException(error, {
			context: 'handleGetOrganizationSettings',
			orgId,
		})
		return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
	}
}

/**
 * ## handleUpdateOrganizationSettings
 *
 * Handles PUT requests to update organization settings. Verifies that the current user
 * has admin or higher role in the organization. If settings don't exist yet, creates them.
 * Validates that pricing values are positive integers and brand colors are valid hex codes.
 * Returns 400 if orgId is invalid or body validation fails, 401 if unauthenticated,
 * 404 if user profile not found, 403 if user lacks admin+ permission or organization
 * does not exist, or 200 with the updated organization settings.
 *
 * @example
 * const response = await handleUpdateOrganizationSettings(request, 'org-uuid')
 * const { settings } = await response.json()
 */
export async function handleUpdateOrganizationSettings(
	request: Request,
	orgId: string,
): Promise<Response> {
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

	const role = await getUserOrgRole(profile.id, orgId)
	if (!role || !hasMinimumRole(role, 'admin')) {
		return Response.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
	}

	let body: unknown
	try {
		body = await request.json()
	} catch {
		return Response.json({ error: { code: 'INVALID_JSON' } }, { status: 400 })
	}

	const bodyResult = updateOrganizationSettingsRequestSchema.safeParse(body)
	if (!bodyResult.success) {
		return Response.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
	}

	try {
		const existingResults = await db
			.select()
			.from(organizationSettings)
			.where(eq(organizationSettings.organizationId, orgId))
			.limit(1)

		const existingSettings = existingResults.at(0)

		const updateData: {
			defaultMonthlyPrice?: number | null
			defaultYearlyPrice?: number | null
			brandColorPrimary?: string | null
			brandColorSecondary?: string | null
			brandLogoUrl?: string | null
			updatedAt: Date
		} = {
			updatedAt: new Date(),
		}

		if (bodyResult.data.defaultMonthlyPrice !== undefined) {
			updateData.defaultMonthlyPrice = bodyResult.data.defaultMonthlyPrice ?? null
		}
		if (bodyResult.data.defaultYearlyPrice !== undefined) {
			updateData.defaultYearlyPrice = bodyResult.data.defaultYearlyPrice ?? null
		}
		if (bodyResult.data.brandColorPrimary !== undefined) {
			updateData.brandColorPrimary = bodyResult.data.brandColorPrimary ?? null
		}
		if (bodyResult.data.brandColorSecondary !== undefined) {
			updateData.brandColorSecondary = bodyResult.data.brandColorSecondary ?? null
		}
		if (bodyResult.data.brandLogoUrl !== undefined) {
			updateData.brandLogoUrl = bodyResult.data.brandLogoUrl ?? null
		}

		let settings
		if (existingSettings) {
			const [updatedSettings] = await db
				.update(organizationSettings)
				.set(updateData)
				.where(eq(organizationSettings.organizationId, orgId))
				.returning()

			settings = updatedSettings
		} else {
			const insertData = {
				organizationId: orgId,
				defaultMonthlyPrice: updateData.defaultMonthlyPrice,
				defaultYearlyPrice: updateData.defaultYearlyPrice,
				brandColorPrimary: updateData.brandColorPrimary,
				brandColorSecondary: updateData.brandColorSecondary,
				brandLogoUrl: updateData.brandLogoUrl,
			}

			const [createdSettings] = await db.insert(organizationSettings).values(insertData).returning()

			settings = createdSettings
		}

		const validatedSettings = organizationSettingsSchema.parse(settings)
		return Response.json({ settings: validatedSettings })
	} catch (error) {
		captureServerException(error, {
			context: 'handleUpdateOrganizationSettings',
			orgId,
		})
		return Response.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
	}
}

export const Route = createFileRoute('/api/organizations/$orgId/settings')({
	server: {
		handlers: {
			GET: ({ request, params }) => handleGetOrganizationSettings(request, params.orgId),
			PUT: ({ request, params }) => handleUpdateOrganizationSettings(request, params.orgId),
		},
	},
})
