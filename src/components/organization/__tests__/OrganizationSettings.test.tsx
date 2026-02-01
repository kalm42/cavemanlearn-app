import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrganizationSettings } from '../OrganizationSettings'
import type { OrganizationWithRole } from '@/db/validators'
import { m } from '@/paraglide/messages'

beforeAll(() => {
	HTMLDialogElement.prototype.showModal = vi.fn()
	HTMLDialogElement.prototype.close = vi.fn()
})

const baseOrganization: OrganizationWithRole = {
	id: 'test-org-id',
	name: 'Test Organization',
	slug: 'test-organization',
	description: 'A test organization description',
	logoUrl: null,
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01'),
	role: 'owner',
	memberCount: 5,
}

const defaultProps = {
	organization: baseOrganization,
	name: 'Test Organization',
	description: 'A test organization description',
	nameError: null,
	descriptionError: null,
	successMessage: null,
	errorMessage: null,
	deleteErrorMessage: null,
	showDeleteConfirm: false,
	isPendingUpdate: false,
	isPendingDelete: false,
	onNameChange: vi.fn(),
	onDescriptionChange: vi.fn(),
	onSubmit: vi.fn(),
	onDeleteClick: vi.fn(),
	onDeleteCancel: vi.fn(),
	onDeleteConfirm: vi.fn(),
}

describe('OrganizationSettings', () => {
	describe('access control', () => {
		it('shows access denied for viewer role', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'viewer' as const }

			// Act
			render(<OrganizationSettings {...defaultProps} organization={org} />)

			// Assert
			expect(screen.getByText(m.organization_settings_access_denied())).toBeInTheDocument()
			expect(screen.queryByLabelText(m.organization_settings_name_label())).not.toBeInTheDocument()
		})

		it('shows access denied for writer role', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'writer' as const }

			// Act
			render(<OrganizationSettings {...defaultProps} organization={org} />)

			// Assert
			expect(screen.getByText(m.organization_settings_access_denied())).toBeInTheDocument()
			expect(screen.queryByLabelText(m.organization_settings_name_label())).not.toBeInTheDocument()
		})

		it('shows access denied for editor role', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'editor' as const }

			// Act
			render(<OrganizationSettings {...defaultProps} organization={org} />)

			// Assert
			expect(screen.getByText(m.organization_settings_access_denied())).toBeInTheDocument()
			expect(screen.queryByLabelText(m.organization_settings_name_label())).not.toBeInTheDocument()
		})

		it('shows settings form for admin role', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'admin' as const }

			// Act
			render(<OrganizationSettings {...defaultProps} organization={org} />)

			// Assert
			expect(screen.queryByText(m.organization_settings_access_denied())).not.toBeInTheDocument()
			expect(screen.getByLabelText(m.organization_settings_name_label())).toBeInTheDocument()
		})

		it('shows settings form for owner role', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettings {...defaultProps} organization={org} />)

			// Assert
			expect(screen.queryByText(m.organization_settings_access_denied())).not.toBeInTheDocument()
			expect(screen.getByLabelText(m.organization_settings_name_label())).toBeInTheDocument()
		})
	})

	describe('settings form', () => {
		it('displays organization name in input', () => {
			// Arrange & Act
			render(<OrganizationSettings {...defaultProps} />)

			// Assert
			const nameInput = screen.getByLabelText(m.organization_settings_name_label())
			expect(nameInput).toHaveValue('Test Organization')
		})

		it('displays organization description in textarea', () => {
			// Arrange & Act
			render(<OrganizationSettings {...defaultProps} />)

			// Assert
			const descInput = screen.getByLabelText(m.organization_settings_description_label())
			expect(descInput).toHaveValue('A test organization description')
		})

		it('displays empty description when empty string', () => {
			// Arrange & Act
			render(<OrganizationSettings {...defaultProps} description="" />)

			// Assert
			const descInput = screen.getByLabelText(m.organization_settings_description_label())
			expect(descInput).toHaveValue('')
		})

		it('shows general title', () => {
			// Arrange & Act
			render(<OrganizationSettings {...defaultProps} />)

			// Assert
			expect(screen.getByText(m.organization_settings_general_title())).toBeInTheDocument()
		})

		it('shows save button', () => {
			// Arrange & Act
			render(<OrganizationSettings {...defaultProps} />)

			// Assert
			expect(
				screen.getByRole('button', { name: m.organization_settings_save() }),
			).toBeInTheDocument()
		})
	})

	describe('danger zone', () => {
		it('shows danger zone for owner', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettings {...defaultProps} organization={org} />)

			// Assert
			expect(screen.getByText(m.organization_settings_danger_zone())).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: m.organization_settings_delete_button() }),
			).toBeInTheDocument()
		})

		it('hides danger zone for admin', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'admin' as const }

			// Act
			render(<OrganizationSettings {...defaultProps} organization={org} />)

			// Assert
			expect(screen.queryByText(m.organization_settings_danger_zone())).not.toBeInTheDocument()
		})

		it('shows danger description', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettings {...defaultProps} organization={org} />)

			// Assert
			expect(screen.getByText(m.organization_settings_danger_description())).toBeInTheDocument()
		})
	})

	describe('loading states', () => {
		it('disables form inputs when update is pending', () => {
			// Arrange & Act
			render(<OrganizationSettings {...defaultProps} isPendingUpdate={true} />)

			// Assert
			const nameInput = screen.getByLabelText(m.organization_settings_name_label())
			const descInput = screen.getByLabelText(m.organization_settings_description_label())
			expect(nameInput).toBeDisabled()
			expect(descInput).toBeDisabled()
		})

		it('shows saving label when update is pending', () => {
			// Arrange & Act
			render(<OrganizationSettings {...defaultProps} isPendingUpdate={true} />)

			// Assert
			expect(
				screen.getByRole('button', { name: m.organization_settings_saving() }),
			).toBeInTheDocument()
		})

		it('shows deleting label when delete is pending', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettings {...defaultProps} organization={org} isPendingDelete={true} />)

			// Assert
			expect(
				screen.getByRole('button', { name: m.organization_settings_deleting() }),
			).toBeInTheDocument()
		})

		it('disables delete button when delete is pending', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettings {...defaultProps} organization={org} isPendingDelete={true} />)

			// Assert
			expect(
				screen.getByRole('button', { name: m.organization_settings_deleting() }),
			).toBeDisabled()
		})
	})

	describe('messages', () => {
		it('shows success message when provided', () => {
			// Arrange & Act
			render(
				<OrganizationSettings
					{...defaultProps}
					successMessage={m.organization_settings_save_success()}
				/>,
			)

			// Assert
			expect(screen.getByText(m.organization_settings_save_success())).toBeInTheDocument()
		})

		it('shows error message when provided', () => {
			// Arrange & Act
			render(
				<OrganizationSettings
					{...defaultProps}
					errorMessage={m.organization_settings_save_error()}
				/>,
			)

			// Assert
			expect(screen.getByText(m.organization_settings_save_error())).toBeInTheDocument()
		})

		it('shows delete error message when provided', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(
				<OrganizationSettings
					{...defaultProps}
					organization={org}
					deleteErrorMessage={m.organization_settings_delete_error()}
				/>,
			)

			// Assert
			expect(screen.getByText(m.organization_settings_delete_error())).toBeInTheDocument()
		})
	})
})
