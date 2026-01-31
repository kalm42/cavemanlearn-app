/**
 * ## slugify
 *
 * Converts a string to a URL-safe slug. Transforms the input to lowercase,
 * replaces spaces and special characters with hyphens, removes consecutive hyphens,
 * and trims hyphens from the start and end.
 *
 * This is a pure function that can be used in both client and server contexts.
 *
 * @example
 * slugify('Hello World!') // 'hello-world'
 *
 * @example
 * slugify('Test & Example') // 'test-example'
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '') // Remove special characters
		.replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
		.replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}
