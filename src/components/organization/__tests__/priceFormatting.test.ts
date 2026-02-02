import { describe, expect, it } from 'vitest'
import { centsToDollars, dollarsToCents, formatDollarsToUsd } from '../priceFormatting'

describe('priceFormatting', () => {
	describe('formatDollarsToUsd', () => {
		it('formats a dollar amount to USD currency string', () => {
			expect(formatDollarsToUsd('9.99')).toBe('$9.99')
		})

		it('formats whole dollar amounts with cents', () => {
			expect(formatDollarsToUsd('19')).toBe('$19.00')
		})

		it('formats large amounts with commas', () => {
			expect(formatDollarsToUsd('1234.56')).toBe('$1,234.56')
		})

		it('returns null for empty string', () => {
			expect(formatDollarsToUsd('')).toBe(null)
		})

		it('returns null for invalid input', () => {
			expect(formatDollarsToUsd('abc')).toBe(null)
		})

		it('returns null for zero', () => {
			expect(formatDollarsToUsd('0')).toBe(null)
		})

		it('returns null for negative numbers', () => {
			expect(formatDollarsToUsd('-5')).toBe(null)
		})
	})

	describe('dollarsToCents', () => {
		it('converts dollars to cents', () => {
			expect(dollarsToCents(9.99)).toBe(999)
		})

		it('converts whole dollars to cents', () => {
			expect(dollarsToCents(19)).toBe(1900)
		})

		it('rounds to avoid floating point issues', () => {
			// 19.99 * 100 = 1998.9999999999998 in JS, should round to 1999
			expect(dollarsToCents(19.99)).toBe(1999)
		})
	})

	describe('centsToDollars', () => {
		it('converts cents to dollars', () => {
			expect(centsToDollars(999)).toBe(9.99)
		})

		it('converts whole dollar amounts', () => {
			expect(centsToDollars(1900)).toBe(19)
		})
	})
})
