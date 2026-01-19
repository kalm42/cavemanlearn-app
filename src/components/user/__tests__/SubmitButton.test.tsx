import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import SubmitButton from '../SubmitButton'

describe('SubmitButton', () => {
	it('shows loading label when submitting', () => {
		// Arrange
		render(
			<SubmitButton
				enabled={true}
				isSubmitting={true}
				label="Continue"
				loadingLabel="Creating..."
			/>,
		)

		// Assert
		expect(screen.getByRole('button', { name: 'Creating...' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled()
	})

	it('is disabled when not enabled', () => {
		// Arrange
		render(
			<SubmitButton
				enabled={false}
				isSubmitting={false}
				label="Continue"
				loadingLabel="Creating..."
			/>,
		)

		// Assert
		expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
	})
})
