import { describe, expect, it } from 'vitest'
import { getProfileCreationErrorMessage } from './errors'
import { m } from '@/paraglide/messages'

describe('getProfileCreationErrorMessage', () => {
	it('returns authentication error for authentication failures', () => {
		// Arrange & Act
		const result = getProfileCreationErrorMessage(new Error('Not authenticated'))

		// Assert
		expect(result).toBe(m.onboarding_error_not_authenticated())
	})

	it('returns profile exists error for existing profile', () => {
		// Arrange & Act
		const result = getProfileCreationErrorMessage(new Error('Profile already exists'))

		// Assert
		expect(result).toBe(m.onboarding_error_profile_exists())
	})

	it('returns server error for server failures', () => {
		// Arrange & Act
		const result = getProfileCreationErrorMessage(new Error('Failed to create profile: 500'))

		// Assert
		expect(result).toBe(m.onboarding_error_server())
	})

	it('returns unknown error for unrecognized errors', () => {
		// Arrange & Act
		const result = getProfileCreationErrorMessage(new Error('Some random error message'))

		// Assert
		expect(result).toBe(m.onboarding_error_unknown())
	})
})
