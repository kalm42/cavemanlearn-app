import { describe, expect, it } from 'vitest'

import { InsufficientRoleError, getUserOrgRole, requireOrgRole } from '../permissions'
import type { Organization, OrganizationMember, UserProfile } from '@/db/schema'
import { organizationMembers, organizations, userProfiles } from '@/db/schema'

describe('getUserOrgRole', () => {
	const testUserId = '550e8400-e29b-41d4-a716-446655440001'
	const testOrgId = '550e8400-e29b-41d4-a716-446655440002'

	it('returns null when user is not a member of the organization', async () => {
		const result = await getUserOrgRole(testUserId, testOrgId)

		expect(result).toBeNull()
	})

	it('returns the correct role when user is a member', async () => {
		const fakeUser: UserProfile = {
			id: testUserId,
			clerkId: 'clerk_user_123',
			email: 'test@example.com',
			displayName: 'Test User',
			avatarUrl: null,
			userType: 'publisher',
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		await globalThis.testDb.insert(userProfiles).values(fakeUser)

		const fakeOrg: Organization = {
			id: testOrgId,
			name: 'Test Organization',
			slug: 'test-organization',
			description: null,
			logoUrl: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		await globalThis.testDb.insert(organizations).values(fakeOrg)

		const fakeMember: OrganizationMember = {
			id: '550e8400-e29b-41d4-a716-446655440003',
			organizationId: testOrgId,
			userId: testUserId,
			role: 'editor',
			createdAt: new Date(),
		}
		await globalThis.testDb.insert(organizationMembers).values(fakeMember)

		const result = await getUserOrgRole(testUserId, testOrgId)

		expect(result).toBe('editor')
	})

	it('returns owner role for organization owner', async () => {
		const ownerId = '550e8400-e29b-41d4-a716-446655440004'
		const orgId = '550e8400-e29b-41d4-a716-446655440005'

		const fakeUser: UserProfile = {
			id: ownerId,
			clerkId: 'clerk_owner_123',
			email: 'owner@example.com',
			displayName: 'Owner User',
			avatarUrl: null,
			userType: 'publisher',
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		await globalThis.testDb.insert(userProfiles).values(fakeUser)

		const fakeOrg: Organization = {
			id: orgId,
			name: 'Owner Test Org',
			slug: 'owner-test-org',
			description: null,
			logoUrl: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		await globalThis.testDb.insert(organizations).values(fakeOrg)

		const fakeMember: OrganizationMember = {
			id: '550e8400-e29b-41d4-a716-446655440006',
			organizationId: orgId,
			userId: ownerId,
			role: 'owner',
			createdAt: new Date(),
		}
		await globalThis.testDb.insert(organizationMembers).values(fakeMember)

		const result = await getUserOrgRole(ownerId, orgId)

		expect(result).toBe('owner')
	})
})

describe('requireOrgRole', () => {
	const testUserId = '550e8400-e29b-41d4-a716-446655440010'
	const testOrgId = '550e8400-e29b-41d4-a716-446655440011'

	it('throws InsufficientRoleError when user is not a member', async () => {
		const error = (await requireOrgRole(testUserId, testOrgId, 'viewer').catch(
			(e: unknown) => e,
		)) as InsufficientRoleError

		expect(error).toBeInstanceOf(InsufficientRoleError)
		expect(error.actualRole).toBeNull()
		expect(error.requiredRole).toBe('viewer')
	})

	it('throws InsufficientRoleError when user has insufficient role', async () => {
		const userId = '550e8400-e29b-41d4-a716-446655440012'
		const orgId = '550e8400-e29b-41d4-a716-446655440013'

		const fakeUser: UserProfile = {
			id: userId,
			clerkId: 'clerk_viewer_123',
			email: 'viewer@example.com',
			displayName: 'Viewer User',
			avatarUrl: null,
			userType: 'publisher',
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		await globalThis.testDb.insert(userProfiles).values(fakeUser)

		const fakeOrg: Organization = {
			id: orgId,
			name: 'Viewer Test Org',
			slug: 'viewer-test-org',
			description: null,
			logoUrl: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		await globalThis.testDb.insert(organizations).values(fakeOrg)

		const fakeMember: OrganizationMember = {
			id: '550e8400-e29b-41d4-a716-446655440014',
			organizationId: orgId,
			userId: userId,
			role: 'viewer',
			createdAt: new Date(),
		}
		await globalThis.testDb.insert(organizationMembers).values(fakeMember)

		const error = (await requireOrgRole(userId, orgId, 'admin').catch(
			(e: unknown) => e,
		)) as InsufficientRoleError

		expect(error).toBeInstanceOf(InsufficientRoleError)
		expect(error.actualRole).toBe('viewer')
		expect(error.requiredRole).toBe('admin')
	})

	it('returns role when user has exact minimum role', async () => {
		const userId = '550e8400-e29b-41d4-a716-446655440015'
		const orgId = '550e8400-e29b-41d4-a716-446655440016'

		const fakeUser: UserProfile = {
			id: userId,
			clerkId: 'clerk_editor_123',
			email: 'editor@example.com',
			displayName: 'Editor User',
			avatarUrl: null,
			userType: 'publisher',
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		await globalThis.testDb.insert(userProfiles).values(fakeUser)

		const fakeOrg: Organization = {
			id: orgId,
			name: 'Editor Test Org',
			slug: 'editor-test-org',
			description: null,
			logoUrl: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		await globalThis.testDb.insert(organizations).values(fakeOrg)

		const fakeMember: OrganizationMember = {
			id: '550e8400-e29b-41d4-a716-446655440017',
			organizationId: orgId,
			userId: userId,
			role: 'editor',
			createdAt: new Date(),
		}
		await globalThis.testDb.insert(organizationMembers).values(fakeMember)

		const result = await requireOrgRole(userId, orgId, 'editor')

		expect(result).toBe('editor')
	})

	it('returns role when user exceeds minimum role', async () => {
		const userId = '550e8400-e29b-41d4-a716-446655440018'
		const orgId = '550e8400-e29b-41d4-a716-446655440019'

		const fakeUser: UserProfile = {
			id: userId,
			clerkId: 'clerk_admin_123',
			email: 'admin@example.com',
			displayName: 'Admin User',
			avatarUrl: null,
			userType: 'publisher',
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		await globalThis.testDb.insert(userProfiles).values(fakeUser)

		const fakeOrg: Organization = {
			id: orgId,
			name: 'Admin Test Org',
			slug: 'admin-test-org',
			description: null,
			logoUrl: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		}
		await globalThis.testDb.insert(organizations).values(fakeOrg)

		const fakeMember: OrganizationMember = {
			id: '550e8400-e29b-41d4-a716-446655440020',
			organizationId: orgId,
			userId: userId,
			role: 'admin',
			createdAt: new Date(),
		}
		await globalThis.testDb.insert(organizationMembers).values(fakeMember)

		const result = await requireOrgRole(userId, orgId, 'writer')

		expect(result).toBe('admin')
	})
})
