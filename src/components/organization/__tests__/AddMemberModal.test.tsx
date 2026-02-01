import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddMemberModal } from '../AddMemberModal'
import { m } from '@/paraglide/messages'

describe('AddMemberModal', () => {
	beforeEach(() => {
		HTMLDialogElement.prototype.showModal = vi.fn()
		HTMLDialogElement.prototype.close = vi.fn()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('rendering', () => {
		it('renders title and description when open', () => {
			// Arrange
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			// Act
			render(
				<AddMemberModal
					isOpen={true}
					isPending={false}
					errorMessage={null}
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Assert - title appears in h3 and button, check by element id
			const title = document.getElementById('add-member-modal-title')
			expect(title).toBeInTheDocument()
			expect(title?.textContent).toBe(m.organization_members_add_title())
			expect(screen.getByText(m.organization_members_add_description())).toBeInTheDocument()
		})

		it('renders email input field', () => {
			// Arrange
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			// Act
			render(
				<AddMemberModal
					isOpen={true}
					isPending={false}
					errorMessage={null}
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Assert
			const emailInput = screen.getByPlaceholderText(m.organization_members_add_email_placeholder())
			expect(emailInput).toBeInTheDocument()
			expect(emailInput).toHaveAttribute('type', 'email')
		})

		it('renders role selector', () => {
			// Arrange
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			// Act
			render(
				<AddMemberModal
					isOpen={true}
					isPending={false}
					errorMessage={null}
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Assert
			expect(screen.getByText(m.organization_members_add_role_label())).toBeInTheDocument()
		})

		it('renders cancel and submit buttons', () => {
			// Arrange
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			// Act
			render(
				<AddMemberModal
					isOpen={true}
					isPending={false}
					errorMessage={null}
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Assert
			expect(screen.getByText(m.organization_members_add_cancel())).toBeInTheDocument()
			const submitButton = screen.getByRole('button', { name: /add member/i, hidden: true })
			expect(submitButton).toBeInTheDocument()
			expect(submitButton).toHaveAttribute('type', 'submit')
		})

		it('displays error message when provided', () => {
			// Arrange
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			// Act
			render(
				<AddMemberModal
					isOpen={true}
					isPending={false}
					errorMessage="User not found"
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Assert
			expect(screen.getByText('User not found')).toBeInTheDocument()
		})
	})

	describe('pending state', () => {
		it('shows loading text on submit button when pending', () => {
			// Arrange
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			// Act
			render(
				<AddMemberModal
					isOpen={true}
					isPending={true}
					errorMessage={null}
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Assert
			expect(screen.getByText(m.organization_members_add_submitting())).toBeInTheDocument()
		})

		it('disables email input when pending', () => {
			// Arrange
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			// Act
			render(
				<AddMemberModal
					isOpen={true}
					isPending={true}
					errorMessage={null}
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Assert
			const emailInput = screen.getByPlaceholderText(m.organization_members_add_email_placeholder())
			expect(emailInput).toBeDisabled()
		})

		it('disables cancel button when pending', () => {
			// Arrange
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			// Act
			render(
				<AddMemberModal
					isOpen={true}
					isPending={true}
					errorMessage={null}
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Assert
			const cancelButton = screen.getByText(m.organization_members_add_cancel())
			expect(cancelButton).toBeDisabled()
		})
	})

	describe('validation', () => {
		it('disables submit button when email is empty', () => {
			// Arrange
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			// Act
			render(
				<AddMemberModal
					isOpen={true}
					isPending={false}
					errorMessage={null}
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Assert - submit button is disabled when email is empty
			const submitButton = screen.getByRole('button', { name: /add member/i, hidden: true })
			expect(submitButton).toBeDisabled()
		})

		it('enables submit button when email has content', async () => {
			// Arrange
			const user = userEvent.setup()
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			render(
				<AddMemberModal
					isOpen={true}
					isPending={false}
					errorMessage={null}
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Act
			const emailInput = screen.getByPlaceholderText(m.organization_members_add_email_placeholder())
			await user.type(emailInput, 'test@example.com')

			// Assert
			const submitButton = screen.getByRole('button', { name: /add member/i, hidden: true })
			expect(submitButton).not.toBeDisabled()
		})
	})

	describe('submission', () => {
		it('calls onSubmit with email and role when form is valid', async () => {
			// Arrange
			const user = userEvent.setup()
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			render(
				<AddMemberModal
					isOpen={true}
					isPending={false}
					errorMessage={null}
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Act
			const emailInput = screen.getByPlaceholderText(m.organization_members_add_email_placeholder())
			await user.type(emailInput, 'test@example.com')

			const submitButton = screen.getByRole('button', { name: /add member/i, hidden: true })
			await user.click(submitButton)

			// Assert
			expect(onSubmit).toHaveBeenCalledTimes(1)
			expect(onSubmit).toHaveBeenCalledWith('test@example.com', 'viewer')
		})

		it('submits with selected role', async () => {
			// Arrange
			const user = userEvent.setup()
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			render(
				<AddMemberModal
					isOpen={true}
					isPending={false}
					errorMessage={null}
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Act
			const emailInput = screen.getByPlaceholderText(m.organization_members_add_email_placeholder())
			await user.type(emailInput, 'test@example.com')

			const roleSelect = screen.getByRole('combobox', { hidden: true })
			await user.selectOptions(roleSelect, 'admin')

			const submitButton = screen.getByRole('button', { name: /add member/i, hidden: true })
			await user.click(submitButton)

			// Assert
			expect(onSubmit).toHaveBeenCalledWith('test@example.com', 'admin')
		})

		it('trims whitespace from email', async () => {
			// Arrange
			const user = userEvent.setup()
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			render(
				<AddMemberModal
					isOpen={true}
					isPending={false}
					errorMessage={null}
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Act
			const emailInput = screen.getByPlaceholderText(m.organization_members_add_email_placeholder())
			await user.type(emailInput, '  test@example.com  ')

			const submitButton = screen.getByRole('button', { name: /add member/i, hidden: true })
			await user.click(submitButton)

			// Assert
			expect(onSubmit).toHaveBeenCalledWith('test@example.com', 'viewer')
		})
	})

	describe('cancel behavior', () => {
		it('calls onCancel when cancel button is clicked', async () => {
			// Arrange
			const user = userEvent.setup()
			const onCancel = vi.fn()
			const onSubmit = vi.fn()

			render(
				<AddMemberModal
					isOpen={true}
					isPending={false}
					errorMessage={null}
					onCancel={onCancel}
					onSubmit={onSubmit}
				/>,
			)

			// Act
			const cancelButton = screen.getByText(m.organization_members_add_cancel())
			await user.click(cancelButton)

			// Assert
			expect(onCancel).toHaveBeenCalledTimes(1)
		})
	})
})
