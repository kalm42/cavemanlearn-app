import { dollarsToCents } from './priceFormatting'

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

/**
 * ## validatePriceDollars
 *
 * Validates a dollar price string and converts to cents. Returns the
 * price in cents if valid, null if empty (clearing the field), or
 * undefined if invalid. Dollar amounts must be positive and have at
 * most 2 decimal places.
 *
 * @example
 * validatePriceDollars('9.99')  // returns 999
 * validatePriceDollars('19')    // returns 1900
 * validatePriceDollars('')      // returns null
 * validatePriceDollars('0')     // returns undefined (invalid)
 * validatePriceDollars('abc')   // returns undefined (invalid)
 */
export function validatePriceDollars(value: string): number | null | undefined {
	if (value === '') {
		return null
	}
	const num = parseFloat(value)
	if (isNaN(num) || num <= 0) {
		return undefined
	}
	// Check for more than 2 decimal places
	const decimalPart = value.split('.')[1]
	if (decimalPart && decimalPart.length > 2) {
		return undefined
	}
	return dollarsToCents(num)
}

/**
 * ## validateHexColor
 *
 * Validates a hex color string. Returns the color if valid,
 * null if empty (clearing the field), or undefined if invalid.
 * Accepts both 3-digit (#RGB) and 6-digit (#RRGGBB) formats.
 *
 * @example
 * validateHexColor('#FF5733')  // returns '#FF5733'
 * validateHexColor('#F00')     // returns '#F00'
 * validateHexColor('')         // returns null
 * validateHexColor('red')      // returns undefined (invalid)
 */
export function validateHexColor(value: string): string | null | undefined {
	if (value === '') {
		return null
	}
	if (!HEX_COLOR_REGEX.test(value)) {
		return undefined
	}
	return value
}

/**
 * ## validateUrl
 *
 * Validates a URL string. Returns the URL if valid,
 * null if empty (clearing the field), or undefined if invalid.
 *
 * @example
 * validateUrl('https://example.com/logo.png')  // returns the URL
 * validateUrl('')                               // returns null
 * validateUrl('not-a-url')                      // returns undefined (invalid)
 */
export function validateUrl(value: string): string | null | undefined {
	if (value === '') {
		return null
	}
	try {
		new URL(value)
		return value
	} catch {
		return undefined
	}
}

/**
 * ## parseStringToNullable
 *
 * Converts a string value to its nullable form for comparison.
 * Empty strings become null, non-empty strings are returned as-is.
 *
 * @example
 * parseStringToNullable('')        // returns null
 * parseStringToNullable('#FF5733') // returns '#FF5733'
 */
export function parseStringToNullable(value: string): string | null {
	return value === '' ? null : value
}

/**
 * ## parsePriceDollarsToNullableCents
 *
 * Converts a dollar price string to its nullable cents form for comparison.
 * Empty strings become null, valid numbers are converted to cents.
 *
 * @example
 * parsePriceDollarsToNullableCents('')      // returns null
 * parsePriceDollarsToNullableCents('9.99')  // returns 999
 */
export function parsePriceDollarsToNullableCents(value: string): number | null {
	if (value === '') {
		return null
	}
	const num = parseFloat(value)
	if (isNaN(num)) {
		return null
	}
	return dollarsToCents(num)
}
