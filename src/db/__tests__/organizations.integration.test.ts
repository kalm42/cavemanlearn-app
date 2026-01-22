import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { ORG_ROLES, organizationMembers, organizations, userProfiles } from '../schema'
import {
	insertOrganizationMemberSchema,
	insertOrganizationSchema,
	orgRoleSchema,
	organizationMemberSchema,
	organizationSchema,
} from '../validators'

/**
 * ## organizations
 *
 * Tests the organizations and organizationMembers tables in the database. This verifies that
 * the database schema is working as expected for organization-related functionality.
 */
describe('organizations', () => {
	it('creates an organization', async () => {
		// Arrange
		const newOrg = {
			name: 'Test Organization',
			slug: 'test-organization',
			description: 'A test organization',
		}

		// Act
		const [inserted] = await globalThis.testDb.insert(organizations).values(newOrg).returning()

		// Assert
		expect(inserted).toMatchObject({
			name: newOrg.name,
			slug: newOrg.slug,
			description: newOrg.description,
		})
		expect(inserted.id).toBeTruthy()
		expect(inserted.createdAt).toBeInstanceOf(Date)
		expect(inserted.updatedAt).toBeInstanceOf(Date)
	})

	it('enforces unique slug constraint', async () => {
		// Arrange
		const org1 = {
			name: 'First Org',
			slug: 'unique-slug',
		}
		const org2 = {
			name: 'Second Org',
			slug: 'unique-slug',
		}

		await globalThis.testDb.insert(organizations).values(org1)

		// Act & Assert
		await expect(globalThis.testDb.insert(organizations).values(org2)).rejects.toThrow()
	})

	it('reads an organization by slug', async () => {
		// Arrange
		const newOrg = {
			name: 'Readable Org',
			slug: 'readable-org',
		}
		await globalThis.testDb.insert(organizations).values(newOrg)

		// Act
		const [found] = await globalThis.testDb
			.select()
			.from(organizations)
			.where(eq(organizations.slug, newOrg.slug))

		// Assert
		expect(found).toMatchObject({
			name: newOrg.name,
			slug: newOrg.slug,
		})
	})

	it('updates an organization', async () => {
		// Arrange
		const newOrg = {
			name: 'Updatable Org',
			slug: 'updatable-org',
		}
		const [inserted] = await globalThis.testDb.insert(organizations).values(newOrg).returning()

		// Act
		const [updated] = await globalThis.testDb
			.update(organizations)
			.set({ name: 'Updated Org Name', description: 'New description' })
			.where(eq(organizations.id, inserted.id))
			.returning()

		// Assert
		expect(updated.name).toBe('Updated Org Name')
		expect(updated.description).toBe('New description')
	})

	it('deletes an organization', async () => {
		// Arrange
		const newOrg = {
			name: 'Deletable Org',
			slug: 'deletable-org',
		}
		const [inserted] = await globalThis.testDb.insert(organizations).values(newOrg).returning()

		// Act
		await globalThis.testDb.delete(organizations).where(eq(organizations.id, inserted.id))
		const results = await globalThis.testDb
			.select()
			.from(organizations)
			.where(eq(organizations.id, inserted.id))

		// Assert
		expect(results).toHaveLength(0)
	})
})

describe('organizationMembers', () => {
	it('creates an organization member', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'clerk_member_test',
				email: 'member@example.com',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Member Test Org',
				slug: 'member-test-org',
			})
			.returning()

		// Act
		const [member] = await globalThis.testDb
			.insert(organizationMembers)
			.values({
				organizationId: org.id,
				userId: user.id,
				role: 'owner',
			})
			.returning()

		// Assert
		expect(member).toMatchObject({
			organizationId: org.id,
			userId: user.id,
			role: 'owner',
		})
		expect(member.id).toBeTruthy()
		expect(member.createdAt).toBeInstanceOf(Date)
	})

	it('enforces unique organization + user constraint', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'clerk_unique_member',
				email: 'unique@example.com',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Unique Member Org',
				slug: 'unique-member-org',
			})
			.returning()

		await globalThis.testDb.insert(organizationMembers).values({
			organizationId: org.id,
			userId: user.id,
			role: 'owner',
		})

		// Act & Assert
		await expect(
			globalThis.testDb.insert(organizationMembers).values({
				organizationId: org.id,
				userId: user.id,
				role: 'admin',
			}),
		).rejects.toThrow()
	})

	it('cascades delete when organization is deleted', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'clerk_cascade_org',
				email: 'cascade-org@example.com',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Cascade Org',
				slug: 'cascade-org',
			})
			.returning()

		const [member] = await globalThis.testDb
			.insert(organizationMembers)
			.values({
				organizationId: org.id,
				userId: user.id,
				role: 'owner',
			})
			.returning()

		// Act
		await globalThis.testDb.delete(organizations).where(eq(organizations.id, org.id))
		const results = await globalThis.testDb
			.select()
			.from(organizationMembers)
			.where(eq(organizationMembers.id, member.id))

		// Assert
		expect(results).toHaveLength(0)
	})

	it('cascades delete when user is deleted', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'clerk_cascade_user',
				email: 'cascade-user@example.com',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Cascade User Org',
				slug: 'cascade-user-org',
			})
			.returning()

		const [member] = await globalThis.testDb
			.insert(organizationMembers)
			.values({
				organizationId: org.id,
				userId: user.id,
				role: 'owner',
			})
			.returning()

		// Act
		await globalThis.testDb.delete(userProfiles).where(eq(userProfiles.id, user.id))
		const results = await globalThis.testDb
			.select()
			.from(organizationMembers)
			.where(eq(organizationMembers.id, member.id))

		// Assert
		expect(results).toHaveLength(0)
	})

	it('updates a member role', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'clerk_role_update',
				email: 'role-update@example.com',
			})
			.returning()

		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Role Update Org',
				slug: 'role-update-org',
			})
			.returning()

		const [member] = await globalThis.testDb
			.insert(organizationMembers)
			.values({
				organizationId: org.id,
				userId: user.id,
				role: 'viewer',
			})
			.returning()

		// Act
		const [updated] = await globalThis.testDb
			.update(organizationMembers)
			.set({ role: 'admin' })
			.where(eq(organizationMembers.id, member.id))
			.returning()

		// Assert
		expect(updated.role).toBe('admin')
	})
})

describe('ORG_ROLES', () => {
	it('contains all expected roles', () => {
		// Assert
		expect(ORG_ROLES).toEqual(['owner', 'admin', 'editor', 'writer', 'viewer'])
	})

	it('has owner as the first role', () => {
		// Assert
		expect(ORG_ROLES[0]).toBe('owner')
	})

	it('has viewer as the last role', () => {
		// Assert
		expect(ORG_ROLES[ORG_ROLES.length - 1]).toBe('viewer')
	})
})

describe('organization validators', () => {
	it('validates organization schema with valid data', () => {
		// Arrange
		const validOrg = {
			id: '123e4567-e89b-12d3-a456-426614174000',
			name: 'Test Org',
			slug: 'test-org',
			description: 'A test description',
			logoUrl: 'https://example.com/logo.png',
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		// Act
		const result = organizationSchema.safeParse(validOrg)

		// Assert
		expect(result.success).toBe(true)
	})

	it('validates organization schema with nullable fields', () => {
		// Arrange
		const validOrg = {
			id: '123e4567-e89b-12d3-a456-426614174000',
			name: 'Test Org',
			slug: 'test-org',
			description: null,
			logoUrl: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		// Act
		const result = organizationSchema.safeParse(validOrg)

		// Assert
		expect(result.success).toBe(true)
	})

	it('validates insert organization schema', () => {
		// Arrange
		const validInsert = {
			name: 'New Org',
			slug: 'new-org',
		}

		// Act
		const result = insertOrganizationSchema.safeParse(validInsert)

		// Assert
		expect(result.success).toBe(true)
	})

	it('rejects insert organization schema with empty name', () => {
		// Arrange
		const invalidInsert = {
			name: '',
			slug: 'empty-name-org',
		}

		// Act
		const result = insertOrganizationSchema.safeParse(invalidInsert)

		// Assert
		expect(result.success).toBe(false)
	})

	it('validates orgRoleSchema with valid roles', () => {
		// Assert
		for (const role of ORG_ROLES) {
			expect(orgRoleSchema.safeParse(role).success).toBe(true)
		}
	})

	it('rejects orgRoleSchema with invalid role', () => {
		// Act
		const result = orgRoleSchema.safeParse('superadmin')

		// Assert
		expect(result.success).toBe(false)
	})

	it('validates organizationMemberSchema with valid data', () => {
		// Arrange
		const validMember = {
			id: '123e4567-e89b-12d3-a456-426614174000',
			organizationId: '223e4567-e89b-12d3-a456-426614174001',
			userId: '323e4567-e89b-12d3-a456-426614174002',
			role: 'admin' as const,
			createdAt: new Date(),
		}

		// Act
		const result = organizationMemberSchema.safeParse(validMember)

		// Assert
		expect(result.success).toBe(true)
	})

	it('validates insertOrganizationMemberSchema', () => {
		// Arrange
		const validInsert = {
			organizationId: '223e4567-e89b-12d3-a456-426614174001',
			userId: '323e4567-e89b-12d3-a456-426614174002',
			role: 'writer' as const,
		}

		// Act
		const result = insertOrganizationMemberSchema.safeParse(validInsert)

		// Assert
		expect(result.success).toBe(true)
	})
})
