import { eq, like } from 'drizzle-orm'

import { db } from '@/db/index.ts'
import { organizations } from '@/db/schema.ts'
import { slugify } from '@/lib/slugify.ts'

// Re-export slugify for backwards compatibility with existing imports
export { slugify } from '@/lib/slugify.ts'

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
