import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyToken } from '@clerk/backend'
import { eq } from 'drizzle-orm'

import { handleCreateOrganization, handleGetOrganizations } from '../api.organizations'
import { organizationMembers, organizations, userProfiles } from '@/db/schema.ts'
import { createMockAuthHeader } from '@/test/utils/clerk'

// Automatically uses __mocks__/@clerk/backend.ts
vi.mock('@clerk/backend')

const mockVerifyToken = vi.mocked(verifyToken)

/**
 * ## GET /api/organizations - Integration
 *
 * Integration tests for the GET /api/organizations endpoint.
 */
describe('GET /api/organizations - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request('http://localhost/api/organizations')

		// Act
		const response = await handleGetOrganizations(request)

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
		const request = new Request('http://localhost/api/organizations', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganizations(request)

		// Assert
		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: 'Profile not found' })
	})

	it('returns empty array when user has no organizations', async () => {
		// Arrange
		const clerkId = 'user_no_orgs'
		const email = 'no-orgs@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/organizations', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganizations(request)

		// Assert
		expect(response.status).toBe(200)
		const body: { organizations: Array<unknown> } = await response.json()
		expect(body.organizations).toEqual([])
	})

	it('returns organizations where user is a member with their role', async () => {
		// Arrange
		const clerkId = 'user_with_orgs'
		const email = 'with-orgs@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [org1] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Org Alpha',
				slug: 'org-alpha',
				description: 'First org',
			})
			.returning()

		const [org2] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Org Beta',
				slug: 'org-beta',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values([
			{ organizationId: org1.id, userId: user.id, role: 'owner' },
			{ organizationId: org2.id, userId: user.id, role: 'editor' },
		])

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/organizations', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganizations(request)

		// Assert
		expect(response.status).toBe(200)
		const body: { organizations: Array<{ name: string; role: string }> } = await response.json()
		expect(body.organizations).toHaveLength(2)

		// Should be ordered by name
		expect(body.organizations[0].name).toBe('Org Alpha')
		expect(body.organizations[0].role).toBe('owner')
		expect(body.organizations[1].name).toBe('Org Beta')
		expect(body.organizations[1].role).toBe('editor')
	})

	it('does not return organizations where user is not a member', async () => {
		// Arrange
		const clerkId = 'user_limited'
		const email = 'limited@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		// Create another user and an org they own
		const [otherUser] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_other',
				email: 'other@example.com',
				userType: 'publisher',
			})
			.returning()

		const [privateOrg] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Private Org',
				slug: 'private-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: privateOrg.id,
			userId: otherUser.id,
			role: 'owner',
		})

		// Create an org the test user is part of
		const [publicOrg] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Public Org',
				slug: 'public-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: publicOrg.id,
			userId: user.id,
			role: 'viewer',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/organizations', {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetOrganizations(request)

		// Assert
		expect(response.status).toBe(200)
		const body: { organizations: Array<{ name: string }> } = await response.json()
		expect(body.organizations).toHaveLength(1)
		expect(body.organizations[0].name).toBe('Public Org')
	})
})

/**
 * ## POST /api/organizations - Integration
 *
 * Integration tests for the POST /api/organizations endpoint.
 */
describe('POST /api/organizations - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request('http://localhost/api/organizations', {
			method: 'POST',
			body: JSON.stringify({ name: 'Test Org' }),
		})

		// Act
		const response = await handleCreateOrganization(request)

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
		const request = new Request('http://localhost/api/organizations', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ name: 'Test Org' }),
		})

		// Act
		const response = await handleCreateOrganization(request)

		// Assert
		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: 'Profile not found' })
	})

	it('returns 400 when name is missing', async () => {
		// Arrange
		const clerkId = 'user_no_name'
		const email = 'no-name@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/organizations', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({}),
		})

		// Act
		const response = await handleCreateOrganization(request)

		// Assert
		expect(response.status).toBe(400)
	})

	it('returns 400 when name is empty', async () => {
		// Arrange
		const clerkId = 'user_empty_name'
		const email = 'empty-name@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/organizations', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ name: '' }),
		})

		// Act
		const response = await handleCreateOrganization(request)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body.error).toBe('Name is required')
	})

	it('creates organization successfully and returns it', async () => {
		// Arrange
		const clerkId = 'user_create_org'
		const email = 'create-org@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/organizations', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ name: 'My New Organization', description: 'A test org' }),
		})

		// Act
		const response = await handleCreateOrganization(request)

		// Assert
		expect(response.status).toBe(201)
		const body: {
			organization: { id: string; name: string; slug: string; description: string }
			membership: { role: string }
		} = await response.json()
		expect(body.organization.name).toBe('My New Organization')
		expect(body.organization.slug).toBe('my-new-organization')
		expect(body.organization.description).toBe('A test org')
		expect(body.membership.role).toBe('owner')
	})

	it('makes the creator the owner', async () => {
		// Arrange
		const clerkId = 'user_owner_test'
		const email = 'owner-test@example.com'
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/organizations', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ name: 'Owner Test Org' }),
		})

		// Act
		const response = await handleCreateOrganization(request)

		// Assert
		expect(response.status).toBe(201)
		const body: {
			organization: { id: string }
			membership: { organizationId: string; userId: string; role: string }
		} = await response.json()
		expect(body.membership.role).toBe('owner')
		expect(body.membership.userId).toBe(user.id)
		expect(body.membership.organizationId).toBe(body.organization.id)

		// Verify in database
		const [member] = await globalThis.testDb
			.select()
			.from(organizationMembers)
			.where(eq(organizationMembers.organizationId, body.organization.id))
			.limit(1)

		expect(member.userId).toBe(user.id)
		expect(member.role).toBe('owner')
	})

	it('generates unique slug when name already exists', async () => {
		// Arrange
		const clerkId = 'user_dup_name'
		const email = 'dup-name@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		// Create an existing org with the same slug
		await globalThis.testDb.insert(organizations).values({
			name: 'Duplicate Name Org',
			slug: 'duplicate-name-org',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/organizations', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ name: 'Duplicate Name Org' }),
		})

		// Act
		const response = await handleCreateOrganization(request)

		// Assert
		expect(response.status).toBe(201)
		const body: { organization: { slug: string } } = await response.json()
		expect(body.organization.slug).toBe('duplicate-name-org-2')
	})

	it('creates organization with only name (no description)', async () => {
		// Arrange
		const clerkId = 'user_name_only'
		const email = 'name-only@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/organizations', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ name: 'Name Only Org' }),
		})

		// Act
		const response = await handleCreateOrganization(request)

		// Assert
		expect(response.status).toBe(201)
		const body: { organization: { name: string; description: string | null } } =
			await response.json()
		expect(body.organization.name).toBe('Name Only Org')
		expect(body.organization.description).toBeNull()
	})

	it('validates name length constraint', async () => {
		// Arrange
		const clerkId = 'user_long_name'
		const email = 'long-name@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request('http://localhost/api/organizations', {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ name: 'a'.repeat(101) }),
		})

		// Act
		const response = await handleCreateOrganization(request)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body.error).toBe('Name must be 100 characters or less')
	})
})
