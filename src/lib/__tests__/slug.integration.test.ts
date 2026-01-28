import { describe, expect, it } from 'vitest'

import { generateUniqueSlug } from '../slug'
import { organizations } from '@/db/schema.ts'

/**
 * ## generateUniqueSlug - Integration
 *
 * Integration tests for the generateUniqueSlug function, which checks the database
 * for existing slugs and appends a number if necessary to ensure uniqueness.
 */
describe('generateUniqueSlug - Integration', () => {
	it('returns the base slug when no duplicates exist', async () => {
		// Arrange & Act
		const slug = await generateUniqueSlug('My Organization')

		// Assert
		expect(slug).toBe('my-organization')
	})

	it('appends -2 when the base slug already exists', async () => {
		// Arrange
		await globalThis.testDb.insert(organizations).values({
			name: 'Test Org',
			slug: 'test-org',
		})

		// Act
		const slug = await generateUniqueSlug('Test Org')

		// Assert
		expect(slug).toBe('test-org-2')
	})

	it('appends -3 when base slug and -2 already exist', async () => {
		// Arrange
		await globalThis.testDb.insert(organizations).values([
			{ name: 'Another Org', slug: 'another-org' },
			{ name: 'Another Org 2', slug: 'another-org-2' },
		])

		// Act
		const slug = await generateUniqueSlug('Another Org')

		// Assert
		expect(slug).toBe('another-org-3')
	})

	it('finds the next available number when there are gaps', async () => {
		// Arrange
		await globalThis.testDb.insert(organizations).values([
			{ name: 'Gap Org', slug: 'gap-org' },
			{ name: 'Gap Org 2', slug: 'gap-org-2' },
			{ name: 'Gap Org 4', slug: 'gap-org-4' },
		])

		// Act
		const slug = await generateUniqueSlug('Gap Org')

		// Assert
		expect(slug).toBe('gap-org-3')
	})

	it('handles empty string names with fallback', async () => {
		// Act
		const slug = await generateUniqueSlug('')

		// Assert
		expect(slug).toMatch(/^org-\d+$/)
	})

	it('handles names with only special characters with fallback', async () => {
		// Act
		const slug = await generateUniqueSlug('!@#$%')

		// Assert
		expect(slug).toMatch(/^org-\d+$/)
	})

	it('handles similar but different slugs correctly', async () => {
		// Arrange - Add slug that is similar but not matching the pattern
		await globalThis.testDb.insert(organizations).values([
			{ name: 'Similar Org', slug: 'similar-org' },
			{ name: 'Similar Org Test', slug: 'similar-org-test' },
		])

		// Act
		const slug = await generateUniqueSlug('Similar Org')

		// Assert
		expect(slug).toBe('similar-org-2')
	})
})
