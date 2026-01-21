import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProfileForm from '../ProfileForm'
import { m } from '@/paraglide/messages'

describe('ProfileForm', () => {
	const defaultProps = {
		initialDisplayName: 'John Doe',
		email: 'john@example.com',
		avatarUrl: 'https://example.com/avatar.png',
		onSubmit: vi.fn(),
	}

	it('renders with initial values', () => {
		// Arrange
		render(<ProfileForm {...defaultProps} />)

		// Assert
		expect(screen.getByLabelText(m.settings_display_name_label())).toHaveValue('John Doe')
		expect(screen.getByLabelText(m.settings_email_label())).toHaveValue('john@example.com')
		expect(screen.getByRole('img', { name: m.settings_avatar_alt() })).toBeInTheDocument()
	})

	it('renders without avatar when avatarUrl is null', () => {
		// Arrange
		render(<ProfileForm {...defaultProps} avatarUrl={null} />)

		// Assert
		expect(screen.queryByRole('img', { name: m.settings_avatar_alt() })).not.toBeInTheDocument()
	})

	it('disables email input', () => {
		// Arrange
		render(<ProfileForm {...defaultProps} />)

		// Assert
		expect(screen.getByLabelText(m.settings_email_label())).toBeDisabled()
	})

	it('disables submit button when no changes are made', () => {
		// Arrange
		render(<ProfileForm {...defaultProps} />)

		// Assert
		const submitButton = screen.getByRole('button', { name: m.settings_save_changes() })
		expect(submitButton).toBeDisabled()
	})

	it('enables submit button when display name is changed', async () => {
		// Arrange
		const user = userEvent.setup()
		render(<ProfileForm {...defaultProps} />)
		const displayNameInput = screen.getByLabelText(m.settings_display_name_label())
		const submitButton = screen.getByRole('button', { name: m.settings_save_changes() })

		// Act
		await user.clear(displayNameInput)
		await user.type(displayNameInput, 'Jane Doe')

		// Assert
		expect(submitButton).not.toBeDisabled()
	})

	it('calls onSubmit with the new display name', async () => {
		// Arrange
		const user = userEvent.setup()
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		render(<ProfileForm {...defaultProps} onSubmit={onSubmit} />)
		const displayNameInput = screen.getByLabelText(m.settings_display_name_label())
		const submitButton = screen.getByRole('button', { name: m.settings_save_changes() })

		// Act
		await user.clear(displayNameInput)
		await user.type(displayNameInput, 'Jane Doe')
		await user.click(submitButton)

		// Assert
		expect(onSubmit).toHaveBeenCalledTimes(1)
		expect(onSubmit).toHaveBeenCalledWith('Jane Doe')
	})

	it('trims display name before submitting', async () => {
		// Arrange
		const user = userEvent.setup()
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		render(<ProfileForm {...defaultProps} onSubmit={onSubmit} />)
		const displayNameInput = screen.getByLabelText(m.settings_display_name_label())
		const submitButton = screen.getByRole('button', { name: m.settings_save_changes() })

		// Act
		await user.clear(displayNameInput)
		await user.type(displayNameInput, '  Jane Doe  ')
		await user.click(submitButton)

		// Assert
		expect(onSubmit).toHaveBeenCalledWith('Jane Doe')
	})

	it('disables submit button when display name is only whitespace', async () => {
		// Arrange
		const user = userEvent.setup()
		render(<ProfileForm {...defaultProps} initialDisplayName="" />)
		const displayNameInput = screen.getByLabelText(m.settings_display_name_label())
		const submitButton = screen.getByRole('button', { name: m.settings_save_changes() })

		// Act - type whitespace only
		await user.type(displayNameInput, '   ')

		// Assert - button should remain disabled because trimmed value is empty
		expect(submitButton).toBeDisabled()
	})

	it('limits display name input to 100 characters', async () => {
		// Arrange
		const user = userEvent.setup()
		render(<ProfileForm {...defaultProps} />)
		const displayNameInput = screen.getByLabelText(m.settings_display_name_label())
		const longName = 'a'.repeat(110)

		// Act
		await user.clear(displayNameInput)
		await user.type(displayNameInput, longName)

		// Assert - input should only have 100 characters due to maxLength attribute
		expect(displayNameInput).toHaveValue('a'.repeat(100))
	})

	it('shows loading state when isSubmitting is true', () => {
		// Arrange
		render(<ProfileForm {...defaultProps} isSubmitting={true} />)

		// Assert
		const submitButton = screen.getByRole('button', { name: m.settings_saving() })
		expect(submitButton).toBeInTheDocument()
		expect(
			screen.queryByRole('button', { name: m.settings_save_changes() }),
		).not.toBeInTheDocument()
	})

	it('disables display name input when isSubmitting is true', () => {
		// Arrange
		render(<ProfileForm {...defaultProps} isSubmitting={true} />)

		// Assert
		expect(screen.getByLabelText(m.settings_display_name_label())).toBeDisabled()
	})
})
