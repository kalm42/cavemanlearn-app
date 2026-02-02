const usdFormatter = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
})

/**
 * ## formatDollarsToUsd
 *
 * Formats a dollar string value to a USD currency display string.
 * Returns null if the input is empty or not a valid positive number.
 * Used to show users a preview of their price input.
 *
 * @example
 * formatDollarsToUsd('9.99')   // returns '$9.99'
 * formatDollarsToUsd('19')     // returns '$19.00'
 * formatDollarsToUsd('')       // returns null
 * formatDollarsToUsd('abc')    // returns null
 */
export function formatDollarsToUsd(value: string): string | null {
	if (value === '') {
		return null
	}
	const num = parseFloat(value)
	if (isNaN(num) || num <= 0) {
		return null
	}
	return usdFormatter.format(num)
}

/**
 * ## dollarsToCents
 *
 * Converts a dollar amount to cents. Multiplies by 100 and rounds
 * to avoid floating point precision issues.
 *
 * @example
 * dollarsToCents(9.99)   // returns 999
 * dollarsToCents(19)     // returns 1900
 */
export function dollarsToCents(dollars: number): number {
	return Math.round(dollars * 100)
}

/**
 * ## centsToDollars
 *
 * Converts a cents amount to dollars.
 *
 * @example
 * centsToDollars(999)    // returns 9.99
 * centsToDollars(1900)   // returns 19
 */
export function centsToDollars(cents: number): number {
	return cents / 100
}
