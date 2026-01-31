import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyToken } from '@clerk/backend'
import { and, eq } from 'drizzle-orm'

import { handleAddMember, handleGetMembers } from '../api.organizations.$orgId.members'
import { organizationMembers, organizations, userProfiles } from '@/db/schema.ts'
import { createMockAuthHeader } from '@/test/utils/clerk'

vi.mock('@clerk/backend')

const mockVerifyToken = vi.mocked(verifyToken)

const VALID_TEST_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

/**
 * ## GET /api/organizations/:orgId/members - Integration
 *
 * Integration tests for the GET /api/organizations/:orgId/members endpoint.
 */
describe('GET /api/organizations/:orgId/members - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 400 for invalid orgId format', async () => {
		// Arrange
		const request = new Request('http://localhost/api/organizations/not-a-uuid/members')

		// Act
		const response = await handleGetMembers(request, 'not-a-uuid')

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'INVALID_UUID' } })
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request(`http://localhost/api/organizations/${VALID_TEST_UUID}/members`)

		// Act
		const response = await handleGetMembers(request, VALID_TEST_UUID)

		// Assert
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'UNAUTHORIZED' } })
	})

	it('returns 404 when user profile does not exist', async () => {
		// Arrange
		const authHeader = createMockAuthHeader(
			mockVerifyToken,
			'user_no_profile',
			'noprofile@example.com',
		)
		const request = new Request(`http://localhost/api/organizations/${VALID_TEST_UUID}/members`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetMembers(request, VALID_TEST_UUID)

		// Assert
		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'PROFILE_NOT_FOUND' } })
	})

	it('returns 403 when user is not a member of the organization', async () => {
		// Arrange
		const clerkId = 'user_not_member_get'
		const email = 'not-member-get@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Private Org',
				slug: 'private-org-get-members',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/members`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetMembers(request, org.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'FORBIDDEN' } })
	})

	it('returns all members with profiles for organization members', async () => {
		// Arrange
		const clerkId = 'user_member_viewer'
		const email = 'member-viewer@example.com'
		const [viewer] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				displayName: 'Viewer User',
				userType: 'publisher',
			})
			.returning()

		const [owner] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_owner_list',
				email: 'owner-list@example.com',
				displayName: 'Owner User',
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Test Org Members',
				slug: 'test-org-members',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values([
			{ organizationId: org.id, userId: owner.id, role: 'owner' },
			{ organizationId: org.id, userId: viewer.id, role: 'viewer' },
		])

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/members`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetMembers(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: {
			members: Array<{
				role: string
				profile: { email: string; displayName: string | null }
			}>
		} = await response.json()
		expect(body.members).toHaveLength(2)
		const roles = body.members.map((m) => m.role)
		expect(roles).toContain('owner')
		expect(roles).toContain('viewer')
		const emails = body.members.map((m) => m.profile.email)
		expect(emails).toContain('owner-list@example.com')
		expect(emails).toContain('member-viewer@example.com')
	})

	it('returns empty array for organization with only the requesting user', async () => {
		// Arrange
		const clerkId = 'user_solo_member'
		const email = 'solo-member@example.com'
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
				name: 'Solo Org',
				slug: 'solo-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'owner',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/members`, {
			headers: { Authorization: authHeader },
		})

		// Act
		const response = await handleGetMembers(request, org.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { members: Array<{ role: string }> } = await response.json()
		expect(body.members).toHaveLength(1)
		expect(body.members[0].role).toBe('owner')
	})
})

/**
 * ## POST /api/organizations/:orgId/members - Integration
 *
 * Integration tests for the POST /api/organizations/:orgId/members endpoint.
 */
describe('POST /api/organizations/:orgId/members - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 400 for invalid orgId format', async () => {
		// Arrange
		const request = new Request('http://localhost/api/organizations/not-a-uuid/members', {
			method: 'POST',
			body: JSON.stringify({ email: 'new@example.com', role: 'editor' }),
		})

		// Act
		const response = await handleAddMember(request, 'not-a-uuid')

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'INVALID_UUID' } })
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request(`http://localhost/api/organizations/${VALID_TEST_UUID}/members`, {
			method: 'POST',
			body: JSON.stringify({ email: 'new@example.com', role: 'editor' }),
		})

		// Act
		const response = await handleAddMember(request, VALID_TEST_UUID)

		// Assert
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'UNAUTHORIZED' } })
	})

	it('returns 403 when user is not a member', async () => {
		// Arrange
		const clerkId = 'user_add_not_member'
		const email = 'add-not-member@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Private Add Org',
				slug: 'private-add-org',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/members`, {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ email: 'new@example.com', role: 'editor' }),
		})

		// Act
		const response = await handleAddMember(request, org.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'FORBIDDEN' } })
	})

	it('returns 403 when user has insufficient role (editor)', async () => {
		// Arrange
		const clerkId = 'user_add_editor'
		const email = 'add-editor@example.com'
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
				name: 'Editor Add Org',
				slug: 'editor-add-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'editor',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/members`, {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ email: 'new@example.com', role: 'writer' }),
		})

		// Act
		const response = await handleAddMember(request, org.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'FORBIDDEN' } })
	})

	it('returns 400 for invalid JSON body', async () => {
		// Arrange
		const clerkId = 'user_add_invalid_json'
		const email = 'add-invalid-json@example.com'
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
				name: 'Invalid JSON Add Org',
				slug: 'invalid-json-add-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/members`, {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: 'invalid json',
		})

		// Act
		const response = await handleAddMember(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'INVALID_JSON' } })
	})

	it('returns 400 for invalid email', async () => {
		// Arrange
		const clerkId = 'user_add_invalid_email'
		const email = 'add-invalid-email@example.com'
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
				name: 'Invalid Email Add Org',
				slug: 'invalid-email-add-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/members`, {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ email: 'not-an-email', role: 'editor' }),
		})

		// Act
		const response = await handleAddMember(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'VALIDATION_ERROR' } })
	})

	it('returns 400 when trying to add owner role', async () => {
		// Arrange
		const clerkId = 'user_add_owner_role'
		const email = 'add-owner-role@example.com'
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
				name: 'Owner Role Add Org',
				slug: 'owner-role-add-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		// Create a user to add
		await globalThis.testDb.insert(userProfiles).values({
			clerkId: 'user_to_add_as_owner',
			email: 'to-add-as-owner@example.com',
			userType: 'publisher',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/members`, {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ email: 'to-add-as-owner@example.com', role: 'owner' }),
		})

		// Act
		const response = await handleAddMember(request, org.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'VALIDATION_ERROR' } })
	})

	it('returns 404 when user to add does not exist', async () => {
		// Arrange
		const clerkId = 'user_add_nonexistent'
		const email = 'add-nonexistent@example.com'
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
				name: 'Nonexistent Add Org',
				slug: 'nonexistent-add-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/members`, {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ email: 'does-not-exist@example.com', role: 'editor' }),
		})

		// Act
		const response = await handleAddMember(request, org.id)

		// Assert
		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'USER_NOT_FOUND' } })
	})

	it('returns 409 when user is already a member', async () => {
		// Arrange
		const clerkId = 'user_add_duplicate'
		const email = 'add-duplicate@example.com'
		const [admin] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [existingMember] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_existing_member',
				email: 'existing-member@example.com',
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Duplicate Add Org',
				slug: 'duplicate-add-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values([
			{ organizationId: org.id, userId: admin.id, role: 'admin' },
			{ organizationId: org.id, userId: existingMember.id, role: 'editor' },
		])

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/members`, {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ email: 'existing-member@example.com', role: 'writer' }),
		})

		// Act
		const response = await handleAddMember(request, org.id)

		// Assert
		expect(response.status).toBe(409)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'ALREADY_MEMBER' } })
	})

	it('adds member successfully as admin', async () => {
		// Arrange
		const clerkId = 'user_add_success_admin'
		const email = 'add-success-admin@example.com'
		const [admin] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [newUser] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_new_member_admin',
				email: 'new-member-admin@example.com',
				displayName: 'New Member',
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Admin Add Success Org',
				slug: 'admin-add-success-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: admin.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/members`, {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ email: 'new-member-admin@example.com', role: 'writer' }),
		})

		// Act
		const response = await handleAddMember(request, org.id)

		// Assert
		expect(response.status).toBe(201)
		const body: {
			member: {
				role: string
				userId: string
				profile: { email: string; displayName: string | null }
			}
		} = await response.json()
		expect(body.member.role).toBe('writer')
		expect(body.member.userId).toBe(newUser.id)
		expect(body.member.profile.email).toBe('new-member-admin@example.com')
		expect(body.member.profile.displayName).toBe('New Member')

		// Verify the member was actually created in the database
		const members = await globalThis.testDb
			.select()
			.from(organizationMembers)
			.where(
				and(
					eq(organizationMembers.organizationId, org.id),
					eq(organizationMembers.userId, newUser.id),
				),
			)
		expect(members).toHaveLength(1)
		expect(members[0].role).toBe('writer')
	})

	it('adds member successfully as owner', async () => {
		// Arrange
		const clerkId = 'user_add_success_owner'
		const email = 'add-success-owner@example.com'
		const [owner] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [newUser] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_new_member_owner',
				email: 'new-member-owner@example.com',
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Owner Add Success Org',
				slug: 'owner-add-success-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: owner.id,
			role: 'owner',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(`http://localhost/api/organizations/${org.id}/members`, {
			method: 'POST',
			headers: { Authorization: authHeader },
			body: JSON.stringify({ email: 'new-member-owner@example.com', role: 'admin' }),
		})

		// Act
		const response = await handleAddMember(request, org.id)

		// Assert
		expect(response.status).toBe(201)
		const body: { member: { role: string; userId: string } } = await response.json()
		expect(body.member.role).toBe('admin')
		expect(body.member.userId).toBe(newUser.id)
	})
})
