import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { organizationSettings, organizations } from '../schema'
import type { NewOrganizationSettings, OrganizationSettings } from '../schema'

/**
 * ## organizationSettings
 *
 * Tests the organization_settings table in the database. This verifies that the database schema
 * is working as expected for organization settings functionality including pricing and branding.
 */
describe('organizationSettings', () => {
	it('creates organization settings with all fields', async () => {
		// Arrange
		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Test Org',
				slug: 'test-org-settings',
			})
			.returning()

		const newSettings: NewOrganizationSettings = {
			organizationId: org.id,
			defaultMonthlyPrice: 999,
			defaultYearlyPrice: 9999,
			brandColorPrimary: '#FF5733',
			brandColorSecondary: '#33FF57',
			brandLogoUrl: 'https://example.com/logo.png',
		}

		// Act
		const [inserted] = await globalThis.testDb
			.insert(organizationSettings)
			.values(newSettings)
			.returning()

		// Assert
		expect(inserted).toMatchObject({
			organizationId: org.id,
			defaultMonthlyPrice: 999,
			defaultYearlyPrice: 9999,
			brandColorPrimary: '#FF5733',
			brandColorSecondary: '#33FF57',
			brandLogoUrl: 'https://example.com/logo.png',
		})
		expect(inserted.id).toBeTruthy()
		expect(inserted.createdAt).toBeInstanceOf(Date)
		expect(inserted.updatedAt).toBeInstanceOf(Date)
	})

	it('creates organization settings with only organization id', async () => {
		// Arrange
		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Minimal Settings Org',
				slug: 'minimal-settings-org',
			})
			.returning()

		const newSettings: NewOrganizationSettings = {
			organizationId: org.id,
		}

		// Act
		const [inserted] = await globalThis.testDb
			.insert(organizationSettings)
			.values(newSettings)
			.returning()

		// Assert
		expect(inserted).toMatchObject({
			organizationId: org.id,
			defaultMonthlyPrice: null,
			defaultYearlyPrice: null,
			brandColorPrimary: null,
			brandColorSecondary: null,
			brandLogoUrl: null,
		})
	})

	it('enforces unique constraint on organizationId', async () => {
		// Arrange
		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Unique Constraint Org',
				slug: 'unique-constraint-org',
			})
			.returning()

		await globalThis.testDb
			.insert(organizationSettings)
			.values({ organizationId: org.id })
			.returning()

		// Act & Assert
		await expect(
			globalThis.testDb.insert(organizationSettings).values({ organizationId: org.id }),
		).rejects.toThrow()
	})

	it('updates organization settings', async () => {
		// Arrange
		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Update Settings Org',
				slug: 'update-settings-org',
			})
			.returning()

		const [settings] = await globalThis.testDb
			.insert(organizationSettings)
			.values({
				organizationId: org.id,
				defaultMonthlyPrice: 500,
			})
			.returning()

		// Act
		const [updated] = await globalThis.testDb
			.update(organizationSettings)
			.set({
				defaultMonthlyPrice: 999,
				defaultYearlyPrice: 9999,
				brandColorPrimary: '#000000',
			})
			.where(eq(organizationSettings.id, settings.id))
			.returning()

		// Assert
		expect(updated.defaultMonthlyPrice).toBe(999)
		expect(updated.defaultYearlyPrice).toBe(9999)
		expect(updated.brandColorPrimary).toBe('#000000')
	})

	it('cascades delete when organization is deleted', async () => {
		// Arrange
		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Cascade Delete Org',
				slug: 'cascade-delete-org',
			})
			.returning()

		const [settings] = await globalThis.testDb
			.insert(organizationSettings)
			.values({
				organizationId: org.id,
				defaultMonthlyPrice: 999,
			})
			.returning()

		// Act
		await globalThis.testDb.delete(organizations).where(eq(organizations.id, org.id))
		const results = await globalThis.testDb
			.select()
			.from(organizationSettings)
			.where(eq(organizationSettings.id, settings.id))

		// Assert
		expect(results).toHaveLength(0)
	})

	it('reads organization settings by organizationId', async () => {
		// Arrange
		const [org] = await globalThis.testDb
			.insert(organizations)
			.values({
				name: 'Read Settings Org',
				slug: 'read-settings-org',
			})
			.returning()

		await globalThis.testDb
			.insert(organizationSettings)
			.values({
				organizationId: org.id,
				defaultMonthlyPrice: 1299,
				brandColorPrimary: '#123456',
			})
			.returning()

		// Act
		const [result] = await globalThis.testDb
			.select()
			.from(organizationSettings)
			.where(eq(organizationSettings.organizationId, org.id))

		// Assert
		expect(result.organizationId).toBe(org.id)
		expect(result.defaultMonthlyPrice).toBe(1299)
		expect(result.brandColorPrimary).toBe('#123456')
	})
})

describe('OrganizationSettings types', () => {
	it('OrganizationSettings type is correctly inferred from schema', () => {
		// Arrange
		const settings: OrganizationSettings = {
			id: '123e4567-e89b-12d3-a456-426614174000',
			organizationId: '223e4567-e89b-12d3-a456-426614174001',
			defaultMonthlyPrice: 999,
			defaultYearlyPrice: 9999,
			brandColorPrimary: '#FF5733',
			brandColorSecondary: '#33FF57',
			brandLogoUrl: 'https://example.com/logo.png',
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		// Assert
		expect(settings.defaultMonthlyPrice).toBe(999)
		expect(settings.brandColorPrimary).toBe('#FF5733')
	})

	it('OrganizationSettings type allows null for optional fields', () => {
		// Arrange
		const settings: OrganizationSettings = {
			id: '123e4567-e89b-12d3-a456-426614174000',
			organizationId: '223e4567-e89b-12d3-a456-426614174001',
			defaultMonthlyPrice: null,
			defaultYearlyPrice: null,
			brandColorPrimary: null,
			brandColorSecondary: null,
			brandLogoUrl: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		}

		// Assert
		expect(settings.defaultMonthlyPrice).toBeNull()
		expect(settings.brandColorPrimary).toBeNull()
	})

	it('NewOrganizationSettings type allows partial fields', () => {
		// Arrange
		const newSettings: NewOrganizationSettings = {
			organizationId: '223e4567-e89b-12d3-a456-426614174001',
		}

		// Assert
		expect(newSettings.organizationId).toBe('223e4567-e89b-12d3-a456-426614174001')
		expect(newSettings.defaultMonthlyPrice).toBeUndefined()
	})
})
