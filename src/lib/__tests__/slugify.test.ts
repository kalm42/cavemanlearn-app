import { describe, expect, it } from 'vitest'
import { slugify } from '../slugify'

/**
 * ## slugify tests
 *
 * Tests for the slugify pure function that converts strings to URL-safe slugs.
 * These tests import directly from the slugify module to ensure the module
 * works independently of the re-export in slug.ts.
 */
describe('slugify', () => {
	it('converts text to lowercase', () => {
		// Arrange
		const input = 'Hello World'

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('hello-world')
	})

	it('handles all uppercase text', () => {
		// Arrange
		const input = 'UPPERCASE'

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('uppercase')
	})

	it('replaces spaces with hyphens', () => {
		// Arrange
		const input = 'hello world'

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('hello-world')
	})

	it('collapses multiple spaces into single hyphen', () => {
		// Arrange
		const input = 'multiple   spaces'

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('multiple-spaces')
	})

	it('removes special characters', () => {
		// Arrange
		const input = 'test & example'

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('test-example')
	})

	it('removes punctuation', () => {
		// Arrange
		const input = 'hello@world#test!$%^&*()'

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('helloworldtest')
	})

	it('trims leading and trailing whitespace', () => {
		// Arrange
		const input = '  hello world  '

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('hello-world')
	})

	it('removes leading and trailing hyphens', () => {
		// Arrange
		const input = '-hello-world-'

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('hello-world')
	})

	it('handles empty strings', () => {
		// Arrange
		const input = ''

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('')
	})

	it('handles whitespace-only strings', () => {
		// Arrange
		const input = '   '

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('')
	})

	it('handles strings with only special characters', () => {
		// Arrange
		const input = '!@#$%'

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('')
	})

	it('strips non-ASCII unicode characters', () => {
		// Arrange
		const input = 'café'

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('caf')
	})

	it('preserves numbers', () => {
		// Arrange
		const input = 'test123'

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('test123')
	})

	it('handles mixed numbers and text with spaces', () => {
		// Arrange
		const input = '123 test 456'

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('123-test-456')
	})

	it('handles underscores by converting to hyphens', () => {
		// Arrange
		const input = 'hello_world_test'

		// Act
		const result = slugify(input)

		// Assert
		expect(result).toBe('hello-world-test')
	})
})
