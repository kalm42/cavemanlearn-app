import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import { userProfiles } from '../schema'

/**
 * ## userProfiles
 *
 * Tests the userProfiles table in the database. This is making sure that the database is
 * working as expected.
 */
describe('userProfiles', () => {
	it('creates a user profile', async () => {
		const newUser = {
			clerkId: 'clerk_123',
			email: 'test@example.com',
			displayName: 'Test User',
		}

		const [inserted] = await globalThis.testDb.insert(userProfiles).values(newUser).returning()

		expect(inserted).toMatchObject({
			clerkId: newUser.clerkId,
			email: newUser.email,
			displayName: newUser.displayName,
			userType: 'learner',
		})
		expect(inserted.id).toBeTruthy()
		expect(inserted.createdAt).toBeInstanceOf(Date)
	})

	it('reads a user profile by clerkId', async () => {
		const newUser = {
			clerkId: 'clerk_456',
			email: 'read@example.com',
		}
		await globalThis.testDb.insert(userProfiles).values(newUser)

		const [found] = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, newUser.clerkId))

		expect(found).toMatchObject({
			clerkId: newUser.clerkId,
			email: newUser.email,
			userType: 'learner',
		})
	})

	it('updates a user profile', async () => {
		const newUser = {
			clerkId: 'clerk_789',
			email: 'update@example.com',
		}
		const [inserted] = await globalThis.testDb.insert(userProfiles).values(newUser).returning()

		const [updated] = await globalThis.testDb
			.update(userProfiles)
			.set({ displayName: 'Updated Name', userType: 'publisher' })
			.where(eq(userProfiles.id, inserted.id))
			.returning()

		expect(updated.displayName).toBe('Updated Name')
		expect(updated.userType).toBe('publisher')
	})

	it('deletes a user profile', async () => {
		const newUser = {
			clerkId: 'clerk_delete',
			email: 'delete@example.com',
		}
		const [inserted] = await globalThis.testDb.insert(userProfiles).values(newUser).returning()

		await globalThis.testDb.delete(userProfiles).where(eq(userProfiles.id, inserted.id))

		const results = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.id, inserted.id))

		expect(results).toHaveLength(0)
	})

	it('enforces unique clerkId constraint', async () => {
		const user1 = {
			clerkId: 'clerk_unique',
			email: 'user1@example.com',
		}
		const user2 = {
			clerkId: 'clerk_unique',
			email: 'user2@example.com',
		}

		await globalThis.testDb.insert(userProfiles).values(user1)

		await expect(globalThis.testDb.insert(userProfiles).values(user2)).rejects.toThrow()
	})

	it('isolates test data via transaction rollback', async () => {
		const results = await globalThis.testDb
			.select()
			.from(userProfiles)
			.where(eq(userProfiles.clerkId, 'clerk_123'))

		expect(results).toHaveLength(0)
	})
})
