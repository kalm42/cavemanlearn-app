import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyToken } from '@clerk/backend'
import { and, eq } from 'drizzle-orm'

import {
	handleRemoveMember,
	handleUpdateMemberRole,
} from '../api.organizations.$orgId.members.$memberId'
import { organizationMembers, organizations, userProfiles } from '@/db/schema.ts'
import { createMockAuthHeader } from '@/test/utils/clerk'

vi.mock('@clerk/backend')

const mockVerifyToken = vi.mocked(verifyToken)

const VALID_TEST_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
const VALID_MEMBER_UUID = 'b1ffcd88-8b1a-3de7-aa5c-5aa8ac279a00'

/**
 * ## PUT /api/organizations/:orgId/members/:memberId - Integration
 *
 * Integration tests for the PUT /api/organizations/:orgId/members/:memberId endpoint.
 */
describe('PUT /api/organizations/:orgId/members/:memberId - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 400 for invalid orgId format', async () => {
		// Arrange
		const request = new Request(
			`http://localhost/api/organizations/not-a-uuid/members/${VALID_MEMBER_UUID}`,
			{
				method: 'PUT',
				body: JSON.stringify({ role: 'editor' }),
			},
		)

		// Act
		const response = await handleUpdateMemberRole(request, 'not-a-uuid', VALID_MEMBER_UUID)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'INVALID_UUID' } })
	})

	it('returns 400 for invalid memberId format', async () => {
		// Arrange
		const request = new Request(
			`http://localhost/api/organizations/${VALID_TEST_UUID}/members/not-a-uuid`,
			{
				method: 'PUT',
				body: JSON.stringify({ role: 'editor' }),
			},
		)

		// Act
		const response = await handleUpdateMemberRole(request, VALID_TEST_UUID, 'not-a-uuid')

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'INVALID_UUID' } })
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request(
			`http://localhost/api/organizations/${VALID_TEST_UUID}/members/${VALID_MEMBER_UUID}`,
			{
				method: 'PUT',
				body: JSON.stringify({ role: 'editor' }),
			},
		)

		// Act
		const response = await handleUpdateMemberRole(request, VALID_TEST_UUID, VALID_MEMBER_UUID)

		// Assert
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'UNAUTHORIZED' } })
	})

	it('returns 403 when user is not a member', async () => {
		// Arrange
		const clerkId = 'user_update_role_not_member'
		const email = 'update-role-not-member@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Private Update Role Org',
				slug: 'private-update-role-org',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${VALID_MEMBER_UUID}`,
			{
				method: 'PUT',
				headers: { Authorization: authHeader },
				body: JSON.stringify({ role: 'editor' }),
			},
		)

		// Act
		const response = await handleUpdateMemberRole(request, org.id, VALID_MEMBER_UUID)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'FORBIDDEN' } })
	})

	it('returns 403 when user has insufficient role (editor)', async () => {
		// Arrange
		const clerkId = 'user_update_role_editor'
		const email = 'update-role-editor@example.com'
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
				name: 'Editor Update Role Org',
				slug: 'editor-update-role-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'editor',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${VALID_MEMBER_UUID}`,
			{
				method: 'PUT',
				headers: { Authorization: authHeader },
				body: JSON.stringify({ role: 'writer' }),
			},
		)

		// Act
		const response = await handleUpdateMemberRole(request, org.id, VALID_MEMBER_UUID)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'FORBIDDEN' } })
	})

	it('returns 400 for invalid JSON body', async () => {
		// Arrange
		const clerkId = 'user_update_role_invalid_json'
		const email = 'update-role-invalid-json@example.com'
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
				name: 'Invalid JSON Update Role Org',
				slug: 'invalid-json-update-role-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${VALID_MEMBER_UUID}`,
			{
				method: 'PUT',
				headers: { Authorization: authHeader },
				body: 'invalid json',
			},
		)

		// Act
		const response = await handleUpdateMemberRole(request, org.id, VALID_MEMBER_UUID)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'INVALID_JSON' } })
	})

	it('returns 400 when trying to set owner role', async () => {
		// Arrange
		const clerkId = 'user_update_to_owner'
		const email = 'update-to-owner@example.com'
		const [admin] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [targetUser] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_target_for_owner',
				email: 'target-for-owner@example.com',
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'To Owner Update Org',
				slug: 'to-owner-update-org',
			})
			.returning()

		const [targetMember] = await globalThis.testDb
			.insert(organizationMembers)
			.values([
				{ organizationId: org.id, userId: admin.id, role: 'admin' },
				{ organizationId: org.id, userId: targetUser.id, role: 'editor' },
			])
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${targetMember.id}`,
			{
				method: 'PUT',
				headers: { Authorization: authHeader },
				body: JSON.stringify({ role: 'owner' }),
			},
		)

		// Act
		const response = await handleUpdateMemberRole(request, org.id, targetMember.id)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'VALIDATION_ERROR' } })
	})

	it('returns 404 when member does not exist', async () => {
		// Arrange
		const clerkId = 'user_update_role_not_found'
		const email = 'update-role-not-found@example.com'
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
				name: 'Not Found Update Role Org',
				slug: 'not-found-update-role-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const nonExistentMemberId = '00000000-0000-0000-0000-000000000000'
		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${nonExistentMemberId}`,
			{
				method: 'PUT',
				headers: { Authorization: authHeader },
				body: JSON.stringify({ role: 'writer' }),
			},
		)

		// Act
		const response = await handleUpdateMemberRole(request, org.id, nonExistentMemberId)

		// Assert
		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'MEMBER_NOT_FOUND' } })
	})

	it('returns 403 when trying to change owner role', async () => {
		// Arrange
		const clerkId = 'user_update_owner_role'
		const email = 'update-owner-role@example.com'
		const [admin] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [owner] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_owner_to_change',
				email: 'owner-to-change@example.com',
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Owner Change Org',
				slug: 'owner-change-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: admin.id,
			role: 'admin',
		})

		const [ownerMember] = await globalThis.testDb
			.insert(organizationMembers)
			.values({
				organizationId: org.id,
				userId: owner.id,
				role: 'owner',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${ownerMember.id}`,
			{
				method: 'PUT',
				headers: { Authorization: authHeader },
				body: JSON.stringify({ role: 'admin' }),
			},
		)

		// Act
		const response = await handleUpdateMemberRole(request, org.id, ownerMember.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'CANNOT_MODIFY_OWNER' } })
	})

	it('updates member role successfully as admin', async () => {
		// Arrange
		const clerkId = 'user_update_role_success_admin'
		const email = 'update-role-success-admin@example.com'
		const [admin] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [targetUser] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_target_admin_update',
				email: 'target-admin-update@example.com',
				displayName: 'Target User',
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Admin Update Role Success Org',
				slug: 'admin-update-role-success-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: admin.id,
			role: 'admin',
		})

		const [targetMember] = await globalThis.testDb
			.insert(organizationMembers)
			.values({
				organizationId: org.id,
				userId: targetUser.id,
				role: 'editor',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${targetMember.id}`,
			{
				method: 'PUT',
				headers: { Authorization: authHeader },
				body: JSON.stringify({ role: 'writer' }),
			},
		)

		// Act
		const response = await handleUpdateMemberRole(request, org.id, targetMember.id)

		// Assert
		expect(response.status).toBe(200)
		const body: {
			member: {
				id: string
				role: string
				profile: { email: string; displayName: string | null }
			}
		} = await response.json()
		expect(body.member.id).toBe(targetMember.id)
		expect(body.member.role).toBe('writer')
		expect(body.member.profile.email).toBe('target-admin-update@example.com')
		expect(body.member.profile.displayName).toBe('Target User')

		// Verify the role was actually updated in the database
		const updatedMember = await globalThis.testDb
			.select()
			.from(organizationMembers)
			.where(eq(organizationMembers.id, targetMember.id))
		expect(updatedMember[0].role).toBe('writer')
	})

	it('updates member role successfully as owner', async () => {
		// Arrange
		const clerkId = 'user_update_role_success_owner'
		const email = 'update-role-success-owner@example.com'
		const [owner] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [targetUser] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_target_owner_update',
				email: 'target-owner-update@example.com',
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Owner Update Role Success Org',
				slug: 'owner-update-role-success-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: owner.id,
			role: 'owner',
		})

		const [targetMember] = await globalThis.testDb
			.insert(organizationMembers)
			.values({
				organizationId: org.id,
				userId: targetUser.id,
				role: 'viewer',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${targetMember.id}`,
			{
				method: 'PUT',
				headers: { Authorization: authHeader },
				body: JSON.stringify({ role: 'admin' }),
			},
		)

		// Act
		const response = await handleUpdateMemberRole(request, org.id, targetMember.id)

		// Assert
		expect(response.status).toBe(200)
		const body: { member: { role: string } } = await response.json()
		expect(body.member.role).toBe('admin')
	})
})

/**
 * ## DELETE /api/organizations/:orgId/members/:memberId - Integration
 *
 * Integration tests for the DELETE /api/organizations/:orgId/members/:memberId endpoint.
 */
describe('DELETE /api/organizations/:orgId/members/:memberId - Integration', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns 400 for invalid orgId format', async () => {
		// Arrange
		const request = new Request(
			`http://localhost/api/organizations/not-a-uuid/members/${VALID_MEMBER_UUID}`,
			{
				method: 'DELETE',
			},
		)

		// Act
		const response = await handleRemoveMember(request, 'not-a-uuid', VALID_MEMBER_UUID)

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'INVALID_UUID' } })
	})

	it('returns 400 for invalid memberId format', async () => {
		// Arrange
		const request = new Request(
			`http://localhost/api/organizations/${VALID_TEST_UUID}/members/not-a-uuid`,
			{
				method: 'DELETE',
			},
		)

		// Act
		const response = await handleRemoveMember(request, VALID_TEST_UUID, 'not-a-uuid')

		// Assert
		expect(response.status).toBe(400)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'INVALID_UUID' } })
	})

	it('returns 401 when not authenticated', async () => {
		// Arrange
		const request = new Request(
			`http://localhost/api/organizations/${VALID_TEST_UUID}/members/${VALID_MEMBER_UUID}`,
			{
				method: 'DELETE',
			},
		)

		// Act
		const response = await handleRemoveMember(request, VALID_TEST_UUID, VALID_MEMBER_UUID)

		// Assert
		expect(response.status).toBe(401)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'UNAUTHORIZED' } })
	})

	it('returns 403 when user is not a member', async () => {
		// Arrange
		const clerkId = 'user_remove_not_member'
		const email = 'remove-not-member@example.com'
		await globalThis.testDb.insert(userProfiles).values({
			clerkId,
			email,
			userType: 'publisher',
		})

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Private Remove Org',
				slug: 'private-remove-org',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${VALID_MEMBER_UUID}`,
			{
				method: 'DELETE',
				headers: { Authorization: authHeader },
			},
		)

		// Act
		const response = await handleRemoveMember(request, org.id, VALID_MEMBER_UUID)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'FORBIDDEN' } })
	})

	it('returns 403 when user has insufficient role (editor)', async () => {
		// Arrange
		const clerkId = 'user_remove_editor'
		const email = 'remove-editor@example.com'
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
				name: 'Editor Remove Org',
				slug: 'editor-remove-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'editor',
		})

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${VALID_MEMBER_UUID}`,
			{
				method: 'DELETE',
				headers: { Authorization: authHeader },
			},
		)

		// Act
		const response = await handleRemoveMember(request, org.id, VALID_MEMBER_UUID)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'FORBIDDEN' } })
	})

	it('returns 404 when member does not exist', async () => {
		// Arrange
		const clerkId = 'user_remove_not_found'
		const email = 'remove-not-found@example.com'
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
				name: 'Not Found Remove Org',
				slug: 'not-found-remove-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'admin',
		})

		const nonExistentMemberId = '00000000-0000-0000-0000-000000000000'
		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${nonExistentMemberId}`,
			{
				method: 'DELETE',
				headers: { Authorization: authHeader },
			},
		)

		// Act
		const response = await handleRemoveMember(request, org.id, nonExistentMemberId)

		// Assert
		expect(response.status).toBe(404)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'MEMBER_NOT_FOUND' } })
	})

	it('returns 403 when trying to remove owner', async () => {
		// Arrange
		const clerkId = 'user_remove_owner'
		const email = 'remove-owner@example.com'
		const [admin] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [owner] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_owner_to_remove',
				email: 'owner-to-remove@example.com',
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Owner Remove Org',
				slug: 'owner-remove-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: admin.id,
			role: 'admin',
		})

		const [ownerMember] = await globalThis.testDb
			.insert(organizationMembers)
			.values({
				organizationId: org.id,
				userId: owner.id,
				role: 'owner',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${ownerMember.id}`,
			{
				method: 'DELETE',
				headers: { Authorization: authHeader },
			},
		)

		// Act
		const response = await handleRemoveMember(request, org.id, ownerMember.id)

		// Assert
		expect(response.status).toBe(403)
		const body = await response.json()
		expect(body).toEqual({ error: { code: 'CANNOT_MODIFY_OWNER' } })
	})

	it('removes member successfully as admin', async () => {
		// Arrange
		const clerkId = 'user_remove_success_admin'
		const email = 'remove-success-admin@example.com'
		const [admin] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [targetUser] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_target_admin_remove',
				email: 'target-admin-remove@example.com',
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Admin Remove Success Org',
				slug: 'admin-remove-success-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: admin.id,
			role: 'admin',
		})

		const [targetMember] = await globalThis.testDb
			.insert(organizationMembers)
			.values({
				organizationId: org.id,
				userId: targetUser.id,
				role: 'editor',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${targetMember.id}`,
			{
				method: 'DELETE',
				headers: { Authorization: authHeader },
			},
		)

		// Act
		const response = await handleRemoveMember(request, org.id, targetMember.id)

		// Assert
		expect(response.status).toBe(204)

		// Verify the member was actually removed from the database
		const remainingMembers = await globalThis.testDb
			.select()
			.from(organizationMembers)
			.where(
				and(
					eq(organizationMembers.organizationId, org.id),
					eq(organizationMembers.userId, targetUser.id),
				),
			)
		expect(remainingMembers).toHaveLength(0)
	})

	it('removes member successfully as owner', async () => {
		// Arrange
		const clerkId = 'user_remove_success_owner'
		const email = 'remove-success-owner@example.com'
		const [owner] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [targetUser] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_target_owner_remove',
				email: 'target-owner-remove@example.com',
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Owner Remove Success Org',
				slug: 'owner-remove-success-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: owner.id,
			role: 'owner',
		})

		const [targetMember] = await globalThis.testDb
			.insert(organizationMembers)
			.values({
				organizationId: org.id,
				userId: targetUser.id,
				role: 'admin',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${targetMember.id}`,
			{
				method: 'DELETE',
				headers: { Authorization: authHeader },
			},
		)

		// Act
		const response = await handleRemoveMember(request, org.id, targetMember.id)

		// Assert
		expect(response.status).toBe(204)

		// Verify the member was actually removed from the database
		const remainingMembers = await globalThis.testDb
			.select()
			.from(organizationMembers)
			.where(eq(organizationMembers.id, targetMember.id))
		expect(remainingMembers).toHaveLength(0)
	})

	it('admin can remove another admin', async () => {
		// Arrange
		const clerkId = 'user_admin_remove_admin'
		const email = 'admin-remove-admin@example.com'
		const [admin1] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId,
				email,
				userType: 'publisher',
			})
			.returning()

		const [admin2] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_admin2_to_remove',
				email: 'admin2-to-remove@example.com',
				userType: 'publisher',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Admin Remove Admin Org',
				slug: 'admin-remove-admin-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: admin1.id,
			role: 'admin',
		})

		const [admin2Member] = await globalThis.testDb
			.insert(organizationMembers)
			.values({
				organizationId: org.id,
				userId: admin2.id,
				role: 'admin',
			})
			.returning()

		const authHeader = createMockAuthHeader(mockVerifyToken, clerkId, email)
		const request = new Request(
			`http://localhost/api/organizations/${org.id}/members/${admin2Member.id}`,
			{
				method: 'DELETE',
				headers: { Authorization: authHeader },
			},
		)

		// Act
		const response = await handleRemoveMember(request, org.id, admin2Member.id)

		// Assert
		expect(response.status).toBe(204)
	})
})
