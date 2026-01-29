import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyToken } from '@clerk/backend'
import { eq } from 'drizzle-orm'

import {
	handleDeleteOrganization,
	handleGetOrganization,
	handleUpdateOrganization,
} from '../api.organizations.$orgId'
import { organizationMembers, organizations, userProfiles } from '@/db/schema.ts'
import { createMockAuthHeader } from '@/test/utils/clerk'

// Automatically uses __mocks__/@clerk/backend.ts
vi.mock('@clerk/backend')

const mockVerifyToken = vi.mocked(verifyToken)

// Valid UUID for tests that need to pass UUID validation (RFC 4122 compliant)
// Format: xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx where M is version (1-5) and N is variant (8,9,a,b)
const VALID_TEST_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

/**
 * ## GET /api/organizations/:orgId - Integration
 *
 * Integration tests for the GET /api/organizations/:orgId endpoint.
 */
describe('GET /api/organizations/:orgId - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 400 for invalid orgId format', async () => {
		// Arrange
		const request = new Request('http://localhost/api/organizations/not-a-valid-uuid')

		// Act
		const response = await handleGetOrganization(request, 'not-a-valid-uuid')

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: 'Invalid organization ID format' })
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request(`http://localhost/api/organizations/${VALID_TEST_UUID}`)

		// Act
		const response = await handleGetOrganization(request, VALID_TEST_UUID)

		// Assert
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: 'Unauthorized' })
	})

	it('returns 404 when user profile does not exist', async () => {
		// Arrange
		const authHeader = createMockAuthHeader(
			mockVerifyToken,
			'user_no_profile',
			'noprofile@example.com',
		)
		const request = new Request(`http://localhost/api/organizations/${VALID_TEST_UUID}`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganization(request, VALID_TEST_UUID)

		// Assert
		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: 'Profile not found' })
	})

	it('returns 403 when user is not a member of the organization', async () => {
		// Arrange
		const clerkId = 'user_not_member'
		const email = 'not-member@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		// Create an org the user is NOT a member of
		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Private Org',
				slug: 'private-org',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: 'Forbidden' })
	})

	it('returns organization details with member count for members', async () => {
		// Arrange
		const clerkId = 'user_is_member'
		const email = 'is-member@example.com'
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
				name: 'Test Organization',
				slug: 'test-organization',
				description: 'A test org',
			})
			.returning()

		// Add another user to the org
		const [otherUser] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'other_user',
				email: 'other@example.com',
				userType: 'publisher',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values([
			{ organizationId: org.id, userId: user.id, role: 'viewer' },
			{ organizationId: org.id, userId: otherUser.id, role: 'owner' },
		])

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: {
			organization: { name: string; slug: string; description: string; memberCount: number }
		} = await response.json()
		expect(body.organization.name).toBe('Test Organization')
		expect(body.organization.slug).toBe('test-organization')
		expect(body.organization.description).toBe('A test org')
		expect(body.organization.memberCount).toBe(2)
	})

	it('returns 403 when organization does not exist (for security)', async () => {
		// Arrange
		const clerkId = 'user_org_not_found'
		const email = 'org-not-found@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const fakeOrgId = '00000000-0000-0000-0000-000000000000'
		const request = new Request(`http://localhost/api/organizations/${fakeOrgId}`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganization(request, fakeOrgId)

		// Assert
		// Returns 403 instead of 404 to avoid leaking organization existence
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: 'Forbidden' })
	})
})

/**
 * ## PUT /api/organizations/:orgId - Integration
 *
 * Integration tests for the PUT /api/organizations/:orgId endpoint.
 */
describe('PUT /api/organizations/:orgId - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 400 for invalid orgId format', async () => {
		// Arrange
		const request = new Request('http://localhost/api/organizations/not-a-valid-uuid', {
			method: 'PUT',
			body: JSON.stringify({ name: 'Updated Name' }),
		})

		// Act
		const response = await handleUpdateOrganization(request, 'not-a-valid-uuid')

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: 'Invalid organization ID format' })
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request(`http://localhost/api/organizations/${VALID_TEST_UUID}`, {
			method: 'PUT',
			body: JSON.stringify({ name: 'Updated Name' }),
		})

		// Act
		const response = await handleUpdateOrganization(request, VALID_TEST_UUID)

		// Assert
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: 'Unauthorized' })
	})

	it('returns 403 when user is not a member', async () => {
		// Arrange
		const clerkId = 'user_update_not_member'
		const email = 'update-not-member@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Org To Update',
				slug: 'org-to-update',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ name: 'Updated Name' }),
		})

		// Act
		const response = await handleUpdateOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: 'Forbidden' })
	})

	it('returns 403 when user has insufficient role (editor)', async () => {
		// Arrange
		const clerkId = 'user_update_editor'
		const email = 'update-editor@example.com'
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
				name: 'Editor Org',
				slug: 'editor-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'editor',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ name: 'Updated Name' }),
		})

		// Act
		const response = await handleUpdateOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: 'Forbidden' })
	})

	it('returns 400 for invalid JSON body', async () => {
		// Arrange
		const clerkId = 'user_update_invalid_json'
		const email = 'update-invalid-json@example.com'
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
				name: 'Invalid JSON Org',
				slug: 'invalid-json-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: 'invalid json',
		})

		// Act
		const response = await handleUpdateOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: 'Invalid JSON body' })
	})

	it('updates organization name and regenerates slug for admin', async () => {
		// Arrange
		const clerkId = 'user_update_admin'
		const email = 'update-admin@example.com'
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
				name: 'Admin Update Org',
				slug: 'admin-update-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ name: 'New Admin Org Name' }),
		})

		// Act
		const response = await handleUpdateOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { organization: { name: string; slug: string } } = await response.json()
		expect(body.organization.name).toBe('New Admin Org Name')
		expect(body.organization.slug).toBe('new-admin-org-name')
	})

	it('updates organization for owner', async () => {
		// Arrange
		const clerkId = 'user_update_owner'
		const email = 'update-owner@example.com'
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
				name: 'Owner Update Org',
				slug: 'owner-update-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'owner',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ description: 'Updated description' }),
		})

		// Act
		const response = await handleUpdateOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { organization: { name: string; slug: string; description: string } } =
			await response.json()
		expect(body.organization.name).toBe('Owner Update Org')
		expect(body.organization.slug).toBe('owner-update-org')
		expect(body.organization.description).toBe('Updated description')
	})

	it('updates description to null', async () => {
		// Arrange
		const clerkId = 'user_update_null_desc'
		const email = 'update-null-desc@example.com'
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
				name: 'Null Desc Org',
				slug: 'null-desc-org',
				description: 'Has a description',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ description: null }),
		})

		// Act
		const response = await handleUpdateOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { organization: { description: string | null } } = await response.json()
		expect(body.organization.description).toBeNull()
	})

	it('validates name length constraint', async () => {
		// Arrange
		const clerkId = 'user_update_long_name'
		const email = 'update-long-name@example.com'
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
				name: 'Long Name Org',
				slug: 'long-name-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ name: 'a'.repeat(101) }),
		})

		// Act
		const response = await handleUpdateOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body.error).toBe('Name must be 100 characters or less')
	})

	it('returns 400 for empty update request', async () => {
		// Arrange
		const clerkId = 'user_update_empty'
		const email = 'update-empty@example.com'
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
				name: 'Empty Update Org',
				slug: 'empty-update-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({}),
		})

		// Act
		const response = await handleUpdateOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body.error).toBe('At least one field must be provided for update')
	})

	it('returns 400 for whitespace-only name', async () => {
		// Arrange
		const clerkId = 'user_update_whitespace'
		const email = 'update-whitespace@example.com'
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
				name: 'Whitespace Update Org',
				slug: 'whitespace-update-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ name: '   ' }),
		})

		// Act
		const response = await handleUpdateOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body.error).toBe('Name is required')
	})

	it('trims whitespace from name before saving', async () => {
		// Arrange
		const clerkId = 'user_update_trim'
		const email = 'update-trim@example.com'
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
				name: 'Trim Update Org',
				slug: 'trim-update-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ name: '  Trimmed Name  ' }),
		})

		// Act
		const response = await handleUpdateOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { organization: { name: string; slug: string } } = await response.json()
		expect(body.organization.name).toBe('Trimmed Name')
		expect(body.organization.slug).toBe('trimmed-name')
	})

	it('updates logoUrl with a valid URL', async () => {
		// Arrange
		const clerkId = 'user_update_logo'
		const email = 'update-logo@example.com'
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
				name: 'Logo Update Org',
				slug: 'logo-update-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ logoUrl: 'https://example.com/logo.png' }),
		})

		// Act
		const response = await handleUpdateOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { organization: { logoUrl: string } } = await response.json()
		expect(body.organization.logoUrl).toBe('https://example.com/logo.png')
	})

	it('returns 400 for invalid logoUrl', async () => {
		// Arrange
		const clerkId = 'user_update_invalid_logo'
		const email = 'update-invalid-logo@example.com'
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
				name: 'Invalid Logo Org',
				slug: 'invalid-logo-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ logoUrl: 'not-a-valid-url' }),
		})

		// Act
		const response = await handleUpdateOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body.error).toBe('Logo URL must be a valid URL')
	})

	it('sets logoUrl to null to clear it', async () => {
		// Arrange
		const clerkId = 'user_update_null_logo'
		const email = 'update-null-logo@example.com'
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
				name: 'Null Logo Org',
				slug: 'null-logo-org',
				logoUrl: 'https://example.com/old-logo.png',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'PUT',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ logoUrl: null }),
		})

		// Act
		const response = await handleUpdateOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { organization: { logoUrl: string | null } } = await response.json()
		expect(body.organization.logoUrl).toBeNull()
	})
})

/**
 * ## DELETE /api/organizations/:orgId - Integration
 *
 * Integration tests for the DELETE /api/organizations/:orgId endpoint.
 */
describe('DELETE /api/organizations/:orgId - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 400 for invalid orgId format', async () => {
		// Arrange
		const request = new Request('http://localhost/api/organizations/not-a-valid-uuid', {
			method: 'DELETE',
		})

		// Act
		const response = await handleDeleteOrganization(request, 'not-a-valid-uuid')

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: 'Invalid organization ID format' })
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request(`http://localhost/api/organizations/${VALID_TEST_UUID}`, {
			method: 'DELETE',
		})

		// Act
		const response = await handleDeleteOrganization(request, VALID_TEST_UUID)

		// Assert
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: 'Unauthorized' })
	})

	it('returns 403 when user is not a member', async () => {
		// Arrange
		const clerkId = 'user_delete_not_member'
		const email = 'delete-not-member@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Org To Delete',
				slug: 'org-to-delete',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'DELETE',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleDeleteOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: 'Forbidden' })
	})

	it('returns 403 when user is admin but not owner', async () => {
		// Arrange
		const clerkId = 'user_delete_admin'
		const email = 'delete-admin@example.com'
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
				name: 'Admin Delete Org',
				slug: 'admin-delete-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'DELETE',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleDeleteOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: 'Forbidden' })
	})

	it('deletes organization successfully for owner', async () => {
		// Arrange
		const clerkId = 'user_delete_owner'
		const email = 'delete-owner@example.com'
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
				name: 'Owner Delete Org',
				slug: 'owner-delete-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'owner',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'DELETE',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleDeleteOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(204)

		// Verify organization is deleted
		const remainingOrgs = await globalThis.testDb
			.select()
			.from(organizations)
			.where(eq(organizations.id, org.id))
		expect(remainingOrgs).toHaveLength(0)
	})

	it('cascades delete to organization members', async () => {
		// Arrange
		const clerkId = 'user_delete_cascade'
		const email = 'delete-cascade@example.com'
		const [owner] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [member] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'other_member',
				email: 'other-member@example.com',
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Cascade Delete Org',
				slug: 'cascade-delete-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values([
			{ organizationId: org.id, userId: owner.id, role: 'owner' },
			{ organizationId: org.id, userId: member.id, role: 'editor' },
		])

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}`, {
			method: 'DELETE',
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleDeleteOrganization(request, org.id)

		// Assert
		expect(response.status).toBe(204)

		// Verify members are deleted
		const remainingMembers = await globalThis.testDb
			.select()
			.from(organizationMembers)
			.where(eq(organizationMembers.organizationId, org.id))
		expect(remainingMembers).toHaveLength(0)
	})
})
