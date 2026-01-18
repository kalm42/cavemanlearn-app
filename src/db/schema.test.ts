import { describe, expect, it } from 'vitest'
import { userProfiles } from './schema'
import type { NewUserProfile, UserProfile, UserType } from './schema'

describe('userProfiles schema', () => {
	describe('schema exports', () => {
		it('exports userProfiles table', () => {
			expect(userProfiles).toBeDefined()
		})

		it('exports UserProfile type', () => {
			const profile: UserProfile = {
				id: '123e4567-e89b-12d3-a456-426614174000',
				clerkId: 'clerk_123',
				email: 'test@example.com',
				displayName: 'Test User',
				avatarUrl: 'https://example.com/avatar.jpg',
				userType: 'learner',
				createdAt: new Date(),
				updatedAt: new Date(),
			}
			expect(profile.id).toBe('123e4567-e89b-12d3-a456-426614174000')
		})

		it('exports NewUserProfile type for inserts', () => {
			const newProfile: NewUserProfile = {
				clerkId: 'clerk_123',
				email: 'test@example.com',
			}
			expect(newProfile.clerkId).toBe('clerk_123')
		})
	})

	describe('UserType enum', () => {
		it('accepts learner as a valid UserType', () => {
			const userType: UserType = 'learner'
			expect(userType).toBe('learner')
		})

		it('accepts publisher as a valid UserType', () => {
			const userType: UserType = 'publisher'
			expect(userType).toBe('publisher')
		})
	})

	describe('table columns', () => {
		it('has id column', () => {
			expect(userProfiles.id).toBeDefined()
		})

		it('has clerkId column', () => {
			expect(userProfiles.clerkId).toBeDefined()
		})

		it('has email column', () => {
			expect(userProfiles.email).toBeDefined()
		})

		it('has displayName column', () => {
			expect(userProfiles.displayName).toBeDefined()
		})

		it('has avatarUrl column', () => {
			expect(userProfiles.avatarUrl).toBeDefined()
		})

		it('has userType column', () => {
			expect(userProfiles.userType).toBeDefined()
		})

		it('has createdAt column', () => {
			expect(userProfiles.createdAt).toBeDefined()
		})

		it('has updatedAt column', () => {
			expect(userProfiles.updatedAt).toBeDefined()
		})
	})

	describe('required fields', () => {
		it('id column is not null', () => {
			expect(userProfiles.id.notNull).toBe(true)
		})

		it('clerkId column is not null', () => {
			expect(userProfiles.clerkId.notNull).toBe(true)
		})

		it('email column is not null', () => {
			expect(userProfiles.email.notNull).toBe(true)
		})

		it('userType column is not null', () => {
			expect(userProfiles.userType.notNull).toBe(true)
		})
	})

	describe('optional fields', () => {
		it('displayName column allows null', () => {
			expect(userProfiles.displayName.notNull).toBe(false)
		})

		it('avatarUrl column allows null', () => {
			expect(userProfiles.avatarUrl.notNull).toBe(false)
		})
	})

	describe('default values', () => {
		it('userType defaults to learner', () => {
			expect(userProfiles.userType.default).toBe('learner')
		})

		it('id has a default random UUID generator', () => {
			expect(userProfiles.id.hasDefault).toBe(true)
		})

		it('createdAt has a default value', () => {
			expect(userProfiles.createdAt.hasDefault).toBe(true)
		})

		it('updatedAt has a default value', () => {
			expect(userProfiles.updatedAt.hasDefault).toBe(true)
		})
	})

	describe('constraints', () => {
		it('id is the primary key', () => {
			expect(userProfiles.id.primary).toBe(true)
		})

		it('clerkId is unique', () => {
			expect(userProfiles.clerkId.isUnique).toBe(true)
		})
	})
})
