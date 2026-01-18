import { describe, expect, it } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
	it('converts text to lowercase', () => {
		expect(slugify('Hello World')).toBe('hello-world')
		expect(slugify('UPPERCASE')).toBe('uppercase')
	})

	it('replaces spaces with hyphens', () => {
		expect(slugify('hello world')).toBe('hello-world')
		expect(slugify('multiple   spaces')).toBe('multiple-spaces')
	})

	it('removes special characters', () => {
		expect(slugify('test & example')).toBe('test-example')
		expect(slugify('hello@world#test')).toBe('helloworldtest')
		expect(slugify('test!@#$%^&*()')).toBe('test')
	})

	it('trims leading and trailing whitespace', () => {
		expect(slugify('  hello world  ')).toBe('hello-world')
		expect(slugify('   test   ')).toBe('test')
	})

	it('removes leading and trailing hyphens', () => {
		expect(slugify('-hello-world-')).toBe('hello-world')
		expect(slugify('---test---')).toBe('test')
	})

	it('handles empty strings', () => {
		expect(slugify('')).toBe('')
		expect(slugify('   ')).toBe('')
	})

	it('handles strings with only special characters', () => {
		expect(slugify('!@#$%')).toBe('')
		expect(slugify('---')).toBe('')
	})

	it('handles unicode characters', () => {
		expect(slugify('café')).toBe('caf')
		expect(slugify('naïve')).toBe('nave')
	})

	it('handles numbers', () => {
		expect(slugify('test123')).toBe('test123')
		expect(slugify('123 test 456')).toBe('123-test-456')
	})
})
