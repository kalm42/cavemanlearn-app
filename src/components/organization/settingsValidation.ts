const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

/**
 * ## validatePrice
 *
 * Validates a price string value. Returns the parsed number if valid,
 * null if empty (clearing the field), or undefined if invalid.
 * Prices must be positive integers (in cents).
 *
 * @example
 * validatePrice('999')  // returns 999
 * validatePrice('')     // returns null
 * validatePrice('0')    // returns undefined (invalid)
 * validatePrice('abc')  // returns undefined (invalid)
 */
export function validatePrice(value: string): number | null | undefined {
	if (value === '') {
		return null
	}
	const num = parseInt(value, 10)
	if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
		return undefined
	}
	return num
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
 * ## parsePriceToNullable
 *
 * Converts a price string to its nullable number form for comparison.
 * Empty strings become null, valid numbers are parsed.
 *
 * @example
 * parsePriceToNullable('')    // returns null
 * parsePriceToNullable('999') // returns 999
 */
export function parsePriceToNullable(value: string): number | null {
	return value === '' ? null : parseInt(value, 10)
}
