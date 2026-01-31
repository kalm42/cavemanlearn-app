import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrganizationForm from '../OrganizationForm'
import { m } from '@/paraglide/messages'

describe('OrganizationForm', () => {
	const defaultProps = {
		onSubmit: vi.fn(),
	}

	it('renders all form fields', () => {
		// Arrange
		render(<OrganizationForm {...defaultProps} />)

		// Assert
		expect(screen.getByLabelText(m.organization_create_name_label())).toBeInTheDocument()
		expect(screen.getByLabelText(m.organization_create_description_label())).toBeInTheDocument()
		expect(screen.getByText(m.organization_create_slug_label())).toBeInTheDocument()
	})

	it('disables submit button when name is empty', () => {
		// Arrange
		render(<OrganizationForm {...defaultProps} />)

		// Assert
		const submitButton = screen.getByRole('button', { name: m.organization_create_submit() })
		expect(submitButton).toBeDisabled()
	})

	it('enables submit button when name is provided', async () => {
		// Arrange
		const user = userEvent.setup()
		render(<OrganizationForm {...defaultProps} />)
		const nameInput = screen.getByLabelText(m.organization_create_name_label())
		const submitButton = screen.getByRole('button', { name: m.organization_create_submit() })

		// Act
		await user.type(nameInput, 'My Organization')

		// Assert
		expect(submitButton).not.toBeDisabled()
	})

	it('shows slug preview as user types name', async () => {
		// Arrange
		const user = userEvent.setup()
		render(<OrganizationForm {...defaultProps} />)
		const nameInput = screen.getByLabelText(m.organization_create_name_label())

		// Act
		await user.type(nameInput, 'Test Organization')

		// Assert
		expect(screen.getByText('test-organization')).toBeInTheDocument()
	})

	it('shows default slug preview when name is empty', () => {
		// Arrange
		render(<OrganizationForm {...defaultProps} />)

		// Assert
		expect(screen.getByText('your-organization')).toBeInTheDocument()
	})

	it('calls onSubmit with form data', async () => {
		// Arrange
		const user = userEvent.setup()
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		render(<OrganizationForm onSubmit={onSubmit} />)
		const nameInput = screen.getByLabelText(m.organization_create_name_label())
		const descriptionInput = screen.getByLabelText(m.organization_create_description_label())
		const submitButton = screen.getByRole('button', { name: m.organization_create_submit() })

		// Act
		await user.type(nameInput, 'My Organization')
		await user.type(descriptionInput, 'A test description')
		await user.click(submitButton)

		// Assert
		expect(onSubmit).toHaveBeenCalledTimes(1)
		expect(onSubmit).toHaveBeenCalledWith({
			name: 'My Organization',
			description: 'A test description',
		})
	})

	it('trims name before submitting', async () => {
		// Arrange
		const user = userEvent.setup()
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		render(<OrganizationForm onSubmit={onSubmit} />)
		const nameInput = screen.getByLabelText(m.organization_create_name_label())
		const submitButton = screen.getByRole('button', { name: m.organization_create_submit() })

		// Act
		await user.type(nameInput, '  My Organization  ')
		await user.click(submitButton)

		// Assert
		expect(onSubmit).toHaveBeenCalledWith({
			name: 'My Organization',
			description: null,
		})
	})

	it('submits with null description when description is empty', async () => {
		// Arrange
		const user = userEvent.setup()
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		render(<OrganizationForm onSubmit={onSubmit} />)
		const nameInput = screen.getByLabelText(m.organization_create_name_label())
		const submitButton = screen.getByRole('button', { name: m.organization_create_submit() })

		// Act
		await user.type(nameInput, 'My Organization')
		await user.click(submitButton)

		// Assert
		expect(onSubmit).toHaveBeenCalledWith({
			name: 'My Organization',
			description: null,
		})
	})

	it('disables submit button when name is only whitespace', async () => {
		// Arrange
		const user = userEvent.setup()
		render(<OrganizationForm {...defaultProps} />)
		const nameInput = screen.getByLabelText(m.organization_create_name_label())
		const submitButton = screen.getByRole('button', { name: m.organization_create_submit() })

		// Act - type whitespace only
		await user.type(nameInput, '   ')

		// Assert - button should remain disabled because trimmed value is empty
		expect(submitButton).toBeDisabled()
	})

	it('limits name input to 100 characters', async () => {
		// Arrange
		const user = userEvent.setup()
		render(<OrganizationForm {...defaultProps} />)
		const nameInput = screen.getByLabelText(m.organization_create_name_label())
		const longName = 'a'.repeat(110)

		// Act
		await user.type(nameInput, longName)

		// Assert - input should only have 100 characters due to maxLength attribute
		expect(nameInput).toHaveValue('a'.repeat(100))
	})

	it('limits description input to 500 characters', async () => {
		// Arrange
		const user = userEvent.setup()
		render(<OrganizationForm {...defaultProps} />)
		const descriptionInput = screen.getByLabelText(m.organization_create_description_label())
		const longDescription = 'a'.repeat(510)

		// Act
		await user.type(descriptionInput, longDescription)

		// Assert - input should only have 500 characters due to maxLength attribute
		expect(descriptionInput).toHaveValue('a'.repeat(500))
	})

	it('shows character count for description', async () => {
		// Arrange
		const user = userEvent.setup()
		render(<OrganizationForm {...defaultProps} />)
		const descriptionInput = screen.getByLabelText(m.organization_create_description_label())

		// Assert - shows initial 0/500
		expect(screen.getByText('0/500')).toBeInTheDocument()

		// Act
		await user.type(descriptionInput, 'Hello world')

		// Assert - shows updated count
		expect(screen.getByText('11/500')).toBeInTheDocument()
	})

	it('shows loading state when isSubmitting is true', () => {
		// Arrange
		render(<OrganizationForm {...defaultProps} isSubmitting={true} />)

		// Assert
		const submitButton = screen.getByRole('button', { name: m.organization_create_submitting() })
		expect(submitButton).toBeInTheDocument()
		expect(
			screen.queryByRole('button', { name: m.organization_create_submit() }),
		).not.toBeInTheDocument()
	})

	it('disables inputs when isSubmitting is true', () => {
		// Arrange
		render(<OrganizationForm {...defaultProps} isSubmitting={true} />)

		// Assert
		expect(screen.getByLabelText(m.organization_create_name_label())).toBeDisabled()
		expect(screen.getByLabelText(m.organization_create_description_label())).toBeDisabled()
	})

	it('handles special characters in slug preview', async () => {
		// Arrange
		const user = userEvent.setup()
		render(<OrganizationForm {...defaultProps} />)
		const nameInput = screen.getByLabelText(m.organization_create_name_label())

		// Act
		await user.type(nameInput, 'Test & Example!')

		// Assert - special characters should be removed
		expect(screen.getByText('test-example')).toBeInTheDocument()
	})
})
