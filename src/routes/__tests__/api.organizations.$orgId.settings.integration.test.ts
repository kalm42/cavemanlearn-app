import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyToken } from '@clerk/backend'
import { eq } from 'drizzle-orm'

import {
	handleGetOrganizationSettings,
	handleUpdateOrganizationSettings,
} from '../api.organizations.$orgId.settings'
import {
	organizationMembers,
	organizationSettings,
	organizations,
	userProfiles,
} from '@/db/schema.ts'
import { createMockAuthHeader } from '@/test/utils/clerk'

vi.mock('@clerk/backend')

const mockVerifyToken = vi.mocked(verifyToken)

const VALID_TEST_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

/**
 * ## GET /api/organizations/:orgId/settings - Integration
 *
 * Integration tests for the GET /api/organizations/:orgId/settings endpoint.
 */
describe('GET /api/organizations/:orgId/settings - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 400 for invalid orgId format', async () => {
		// Arrange
		const request = new Request('http://localhost/api/organizations/not-a-valid-uuid/settings')

		// Act
		const response = await handleGetOrganizationSettings(request, 'not-a-valid-uuid')

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'INVALID_UUID' } })
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request(`http://localhost/api/organizations/${VALID_TEST_UUID}/settings`)

		// Act
		const response = await handleGetOrganizationSettings(request, VALID_TEST_UUID)

		// Assert
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'UNAUTHORIZED' } })
	})

	it('returns 404 when user profile does not exist', async () => {
		// Arrange
		const authHeader = createMockAuthHeader(
			mockVerifyToken,
			'user_settings_no_profile',
			'settings-noprofile@example.com',
		)
		const request = new Request(`http://localhost/api/organizations/${VALID_TEST_UUID}/settings`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganizationSettings(request, VALID_TEST_UUID)

		// Assert
		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'PROFILE_NOT_FOUND' } })
	})

	it('returns 403 when user is not a member of the organization', async () => {
		// Arrange
		const clerkId = 'user_settings_not_member'
		const email = 'settings-not-member@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Settings Test Org',
				slug: 'settings-test-org',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'FORBIDDEN' } })
	})

	it('returns 403 for viewer role (insufficient permissions)', async () => {
		// Arrange
		const clerkId = 'user_settings_viewer'
		const email = 'settings-viewer@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Viewer Settings Org',
				slug: 'viewer-settings-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'viewer',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'FORBIDDEN' } })
	})

	it('returns 403 for editor role (insufficient permissions)', async () => {
		// Arrange
		const clerkId = 'user_settings_editor'
		const email = 'settings-editor@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Editor Settings Org',
				slug: 'editor-settings-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'editor',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'FORBIDDEN' } })
	})

	it('returns existing settings for admin', async () => {
		// Arrange
		const clerkId = 'user_settings_admin'
		const email = 'settings-admin@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Admin Settings Org',
				slug: 'admin-settings-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		await globalThis.testDb.insert(organizationSettings).values({
			organizationId: org.id,
			defaultMonthlyPrice: 999,
			defaultYearlyPrice: 9999,
			brandColorPrimary: '#FF5733',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { settings: { defaultMonthlyPrice: number; brandColorPrimary: string } } =
			await response.json()
		expect(body.settings.defaultMonthlyPrice).toBe(999)
		expect(body.settings.brandColorPrimary).toBe('#FF5733')
	})

	it('creates default settings if none exist for owner', async () => {
		// Arrange
		const clerkId = 'user_settings_owner'
		const email = 'settings-owner@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Owner Settings Org',
				slug: 'owner-settings-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'owner',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: {
			settings: {
				organizationId: string
				defaultMonthlyPrice: number | null
				defaultYearlyPrice: number | null
			}
		} = await response.json()
		expect(body.settings.organizationId).toBe(org.id)
		expect(body.settings.defaultMonthlyPrice).toBeNull()
		expect(body.settings.defaultYearlyPrice).toBeNull()

		// Verify settings were created in database
		const settingsInDb = await globalThis.testDb
			.select()
			.from(organizationSettings)
			.where(eq(organizationSettings.organizationId, org.id))
		expect(settingsInDb).toHaveLength(1)
	})
})

/**
 * ## PUT /api/organizations/:orgId/settings - Integration
 *
 * Integration tests for the PUT /api/organizations/:orgId/settings endpoint.
 */
describe('PUT /api/organizations/:orgId/settings - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 400 for invalid orgId format', async () => {
		// Arrange
		const request = new Request('http://localhost/api/organizations/not-a-valid-uuid/settings', {
			method: 'PUT',
			body: JSON.stringify({ defaultMonthlyPrice: 999 }),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, 'not-a-valid-uuid')

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'INVALID_UUID' } })
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request(`http://localhost/api/organizations/${VALID_TEST_UUID}/settings`, {
			method: 'PUT',
			body: JSON.stringify({ defaultMonthlyPrice: 999 }),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, VALID_TEST_UUID)

		// Assert
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'UNAUTHORIZED' } })
	})

	it('returns 403 when user is not a member', async () => {
		// Arrange
		const clerkId = 'user_update_settings_not_member'
		const email = 'update-settings-not-member@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Update Settings Not Member Org',
				slug: 'update-settings-not-member-org',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ defaultMonthlyPrice: 999 }),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'FORBIDDEN' } })
	})

	it('returns 403 for editor role (insufficient permissions)', async () => {
		// Arrange
		const clerkId = 'user_update_settings_editor'
		const email = 'update-settings-editor@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Update Settings Editor Org',
				slug: 'update-settings-editor-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'editor',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ defaultMonthlyPrice: 999 }),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'FORBIDDEN' } })
	})

	it('returns 400 for invalid JSON body', async () => {
		// Arrange
		const clerkId = 'user_update_settings_invalid_json'
		const email = 'update-settings-invalid-json@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Invalid JSON Settings Org',
				slug: 'invalid-json-settings-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: 'invalid json',
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'INVALID_JSON' } })
	})

	it('returns 400 for empty update request', async () => {
		// Arrange
		const clerkId = 'user_update_settings_empty'
		const email = 'update-settings-empty@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Empty Settings Update Org',
				slug: 'empty-settings-update-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({}),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'VALIDATION_ERROR' } })
	})

	it('returns 400 for negative pricing value', async () => {
		// Arrange
		const clerkId = 'user_update_settings_negative_price'
		const email = 'update-settings-negative-price@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Negative Price Settings Org',
				slug: 'negative-price-settings-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ defaultMonthlyPrice: -100 }),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'VALIDATION_ERROR' } })
	})

	it('returns 400 for non-integer pricing value', async () => {
		// Arrange
		const clerkId = 'user_update_settings_float_price'
		const email = 'update-settings-float-price@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Float Price Settings Org',
				slug: 'float-price-settings-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ defaultMonthlyPrice: 9.99 }),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'VALIDATION_ERROR' } })
	})

	it('returns 400 for invalid hex color', async () => {
		// Arrange
		const clerkId = 'user_update_settings_invalid_color'
		const email = 'update-settings-invalid-color@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Invalid Color Settings Org',
				slug: 'invalid-color-settings-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ brandColorPrimary: 'not-a-color' }),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'VALIDATION_ERROR' } })
	})

	it('returns 400 for invalid logo URL', async () => {
		// Arrange
		const clerkId = 'user_update_settings_invalid_url'
		const email = 'update-settings-invalid-url@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Invalid URL Settings Org',
				slug: 'invalid-url-settings-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ brandLogoUrl: 'not-a-valid-url' }),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'VALIDATION_ERROR' } })
	})

	it('updates existing settings for admin', async () => {
		// Arrange
		const clerkId = 'user_update_settings_admin'
		const email = 'update-settings-admin@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Update Settings Admin Org',
				slug: 'update-settings-admin-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		await globalThis.testDb.insert(organizationSettings).values({
			organizationId: org.id,
			defaultMonthlyPrice: 500,
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ defaultMonthlyPrice: 999, brandColorPrimary: '#FF5733' }),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { settings: { defaultMonthlyPrice: number; brandColorPrimary: string } } =
			await response.json()
		expect(body.settings.defaultMonthlyPrice).toBe(999)
		expect(body.settings.brandColorPrimary).toBe('#FF5733')
	})

	it('creates settings if none exist for owner', async () => {
		// Arrange
		const clerkId = 'user_create_settings_owner'
		const email = 'create-settings-owner@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Create Settings Owner Org',
				slug: 'create-settings-owner-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'owner',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ defaultYearlyPrice: 9999 }),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: {
			settings: {
				organizationId: string
				defaultYearlyPrice: number
				defaultMonthlyPrice: number | null
			}
		} = await response.json()
		expect(body.settings.organizationId).toBe(org.id)
		expect(body.settings.defaultYearlyPrice).toBe(9999)
		expect(body.settings.defaultMonthlyPrice).toBeNull()

		// Verify settings were created in database
		const settingsInDb = await globalThis.testDb
			.select()
			.from(organizationSettings)
			.where(eq(organizationSettings.organizationId, org.id))
		expect(settingsInDb).toHaveLength(1)
	})

	it('clears a field by setting it to null', async () => {
		// Arrange
		const clerkId = 'user_clear_settings_field'
		const email = 'clear-settings-field@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Clear Settings Org',
				slug: 'clear-settings-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		await globalThis.testDb.insert(organizationSettings).values({
			organizationId: org.id,
			defaultMonthlyPrice: 999,
			brandColorPrimary: '#FF5733',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ brandColorPrimary: null }),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: {
			settings: { defaultMonthlyPrice: number; brandColorPrimary: string | null }
		} = await response.json()
		expect(body.settings.defaultMonthlyPrice).toBe(999)
		expect(body.settings.brandColorPrimary).toBeNull()
	})

	it('updates brand logo URL with valid URL', async () => {
		// Arrange
		const clerkId = 'user_update_settings_logo'
		const email = 'update-settings-logo@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Update Logo Settings Org',
				slug: 'update-logo-settings-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ brandLogoUrl: 'https://example.com/logo.png' }),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { settings: { brandLogoUrl: string } } = await response.json()
		expect(body.settings.brandLogoUrl).toBe('https://example.com/logo.png')
	})

	it('accepts 3-digit hex color codes', async () => {
		// Arrange
		const clerkId = 'user_update_settings_short_color'
		const email = 'update-settings-short-color@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Short Color Settings Org',
				slug: 'short-color-settings-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ brandColorPrimary: '#F53' }),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { settings: { brandColorPrimary: string } } = await response.json()
		expect(body.settings.brandColorPrimary).toBe('#F53')
	})

	it('updates all fields at once', async () => {
		// Arrange
		const clerkId = 'user_update_settings_all'
		const email = 'update-settings-all@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Update All Settings Org',
				slug: 'update-all-settings-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'owner',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/settings`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({
				defaultMonthlyPrice: 999,
				defaultYearlyPrice: 9999,
				brandColorPrimary: '#FF5733',
				brandColorSecondary: '#33FF57',
				brandLogoUrl: 'https://example.com/logo.png',
			}),
		})

		// Act
		const response = await handleUpdateOrganizationSettings(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: {
			settings: {
				defaultMonthlyPrice: number
				defaultYearlyPrice: number
				brandColorPrimary: string
				brandColorSecondary: string
				brandLogoUrl: string
			}
		} = await response.json()
		expect(body.settings.defaultMonthlyPrice).toBe(999)
		expect(body.settings.defaultYearlyPrice).toBe(9999)
		expect(body.settings.brandColorPrimary).toBe('#FF5733')
		expect(body.settings.brandColorSecondary).toBe('#33FF57')
		expect(body.settings.brandLogoUrl).toBe('https://example.com/logo.png')
	})
})
