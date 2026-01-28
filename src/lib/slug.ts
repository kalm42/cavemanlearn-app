import { eq, like } from 'drizzle-orm'

import { db } from '@/db/index.ts'
import { organizations } from '@/db/schema.ts'

/**
 * ## slugify
 *
 * Converts a string to a URL-safe slug. Transforms the input to lowercase,
 * replaces spaces and special characters with hyphens, removes consecutive hyphens,
 * and trims hyphens from the start and end.
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

/**
 * ## generateUniqueSlug
 *
 * Generates a unique slug for an organization by checking the database for existing
 * slugs and appending a number if necessary. If the base slug already exists, it
 * appends -2, -3, etc. until a unique slug is found.
 *
 * @example
 * // If 'my-org' doesn't exist, returns 'my-org'
 * await generateUniqueSlug('My Org')
 *
 * @example
 * // If 'my-org' exists, returns 'my-org-2'
 * await generateUniqueSlug('My Org')
 */
export async function generateUniqueSlug(name: string): Promise<string> {
	const baseSlug = slugify(name)

	if (!baseSlug) {
		// If the name results in an empty slug, use a fallback
		return `org-${String(Date.now())}`
	}

	// Check if the base slug exists
	const existingWithBase = await db
		.select({ slug: organizations.slug })
		.from(organizations)
		.where(eq(organizations.slug, baseSlug))
		.limit(1)

	if (existingWithBase.length === 0) {
		return baseSlug
	}

	// Find all slugs that match the pattern baseSlug or baseSlug-N
	const existingSlugs = await db
		.select({ slug: organizations.slug })
		.from(organizations)
		.where(like(organizations.slug, `${baseSlug}%`))

	const slugSet = new Set(existingSlugs.map((r) => r.slug))

	// Find the next available number
	let counter = 2
	while (slugSet.has(`${baseSlug}-${String(counter)}`)) {
		counter++
	}

	return `${baseSlug}-${String(counter)}`
}
