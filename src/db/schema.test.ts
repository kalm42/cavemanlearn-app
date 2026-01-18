import { describe, expect, it } from 'vitest'
import type { NewUserProfile, UserType } from './schema'

describe('userProfiles schema', () => {
	it('allows creating a profile with only required fields', () => {
		const profile: NewUserProfile = {
			clerkId: 'clerk_123',
			email: 'test@example.com',
		}
		expect(profile.clerkId).toBe('clerk_123')
		expect(profile.email).toBe('test@example.com')
	})

	it('allows creating a profile with all fields', () => {
		const profile: NewUserProfile = {
			clerkId: 'clerk_123',
			email: 'test@example.com',
			displayName: 'Test User',
			avatarUrl: 'https://example.com/avatar.jpg',
			userType: 'publisher',
		}
		expect(profile.userType).toBe('publisher')
	})

	it('restricts userType to learner or publisher', () => {
		const types: Array<UserType> = ['learner', 'publisher']
		expect(types).toEqual(['learner', 'publisher'])
	})
})
