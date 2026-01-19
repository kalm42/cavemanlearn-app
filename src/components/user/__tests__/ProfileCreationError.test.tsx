import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileCreationError } from '../ProfileCreationError'
import { m } from '@/paraglide/messages'

describe('ProfileCreationError', () => {
	it('returns null when no error', () => {
		// Arrange
		const { container } = render(<ProfileCreationError error={null} />)

		// Assert
		expect(container.firstChild).toBeNull()
	})

	it('displays error message for authentication error', () => {
		// Arrange
		const error = new Error('Not authenticated')
		render(<ProfileCreationError error={error} />)

		// Assert
		expect(screen.getByText(m.onboarding_error_not_authenticated())).toBeInTheDocument()
	})

	it('displays error message for profile exists error', () => {
		// Arrange
		const error = new Error('Profile already exists')
		render(<ProfileCreationError error={error} />)

		// Assert
		expect(screen.getByText(m.onboarding_error_profile_exists())).toBeInTheDocument()
	})

	it('displays unknown error message for unrecognized errors', () => {
		// Arrange
		const error = new Error('Some unexpected error')
		render(<ProfileCreationError error={error} />)

		// Assert
		expect(screen.getByText(m.onboarding_error_unknown())).toBeInTheDocument()
	})
})
