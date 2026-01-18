/**
 * Converts a string to a URL-safe slug.
 * Handles special characters, spaces, and converts to lowercase.
 *
 * @param text - The text to convert to a slug
 * @returns A URL-safe slug string
 *
 * @example
 * ```ts
 * slugify("Hello World!") // "hello-world"
 * slugify("Test & Example") // "test-example"
 * ```
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '') // Remove special characters
		.replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
		.replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}
