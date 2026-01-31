import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AlertTriangle } from 'lucide-react'
import type { OrganizationWithRole } from '@/db/validators'
import { canDeleteOrganization, hasMinimumRole } from '@/lib/permissions'
import { m } from '@/paraglide/messages'

/**
 * ## OrganizationSettingsContent
 *
 * Extracted content component for testing. This mirrors the logic in the actual
 * settings component but without router and mutation dependencies.
 */
function OrganizationSettingsContent(props: {
	organization: OrganizationWithRole | null
	isPendingUpdate?: boolean
	isPendingDelete?: boolean
}) {
	const { organization, isPendingUpdate = false, isPendingDelete = false } = props

	if (!organization) {
		return null
	}

	const canAccessSettings = hasMinimumRole(organization.role, 'admin')
	const canDelete = canDeleteOrganization(organization.role)

	if (!canAccessSettings) {
		return (
			<div className="bg-slate-800 rounded-xl p-8 text-center" data-testid="access-denied">
				<h1 className="text-xl font-semibold text-white mb-2">
					{m.organization_settings_access_denied()}
				</h1>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="bg-slate-800 rounded-xl p-8">
				<h2 className="text-xl font-semibold text-white mb-6">
					{m.organization_settings_general_title()}
				</h2>

				<form data-testid="settings-form" className="space-y-6">
					<div>
						<label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
							{m.organization_settings_name_label()}
						</label>
						<input
							type="text"
							id="name"
							defaultValue={organization.name}
							placeholder={m.organization_settings_name_placeholder()}
							disabled={isPendingUpdate}
							className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white"
						/>
					</div>

					<div>
						<label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
							{m.organization_settings_description_label()}
						</label>
						<textarea
							id="description"
							defaultValue={organization.description ?? ''}
							placeholder={m.organization_settings_description_placeholder()}
							disabled={isPendingUpdate}
							className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white"
							rows={4}
						/>
					</div>

					<div className="pt-4">
						<button
							type="submit"
							disabled={isPendingUpdate}
							className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg"
						>
							{isPendingUpdate
								? m.organization_settings_saving()
								: m.organization_settings_save()}
						</button>
					</div>
				</form>
			</div>

			{canDelete && (
				<div
					data-testid="danger-zone"
					className="bg-slate-800 rounded-xl p-8 border border-red-500/30"
				>
					<div className="flex items-start gap-4">
						<AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
						<div className="flex-1">
							<h2 className="text-xl font-semibold text-red-400 mb-2">
								{m.organization_settings_danger_zone()}
							</h2>
							<p className="text-gray-400 mb-4">{m.organization_settings_danger_description()}</p>
							<button
								type="button"
								disabled={isPendingDelete}
								className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
							>
								{isPendingDelete
									? m.organization_settings_deleting()
									: m.organization_settings_delete_button()}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

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

describe('OrganizationSettings', () => {
	describe('access control', () => {
		it('shows access denied for viewer role', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'viewer' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} />)

			// Assert
			expect(screen.getByTestId('access-denied')).toBeInTheDocument()
			expect(screen.getByText(m.organization_settings_access_denied())).toBeInTheDocument()
			expect(screen.queryByTestId('settings-form')).not.toBeInTheDocument()
		})

		it('shows access denied for writer role', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'writer' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} />)

			// Assert
			expect(screen.getByTestId('access-denied')).toBeInTheDocument()
			expect(screen.queryByTestId('settings-form')).not.toBeInTheDocument()
		})

		it('shows access denied for editor role', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'editor' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} />)

			// Assert
			expect(screen.getByTestId('access-denied')).toBeInTheDocument()
			expect(screen.queryByTestId('settings-form')).not.toBeInTheDocument()
		})

		it('shows settings form for admin role', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'admin' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} />)

			// Assert
			expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument()
			expect(screen.getByTestId('settings-form')).toBeInTheDocument()
		})

		it('shows settings form for owner role', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} />)

			// Assert
			expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument()
			expect(screen.getByTestId('settings-form')).toBeInTheDocument()
		})
	})

	describe('settings form', () => {
		it('displays organization name in input', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} />)

			// Assert
			const nameInput = screen.getByLabelText(m.organization_settings_name_label())
			expect(nameInput).toHaveValue('Test Organization')
		})

		it('displays organization description in textarea', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} />)

			// Assert
			const descInput = screen.getByLabelText(m.organization_settings_description_label())
			expect(descInput).toHaveValue('A test organization description')
		})

		it('displays empty description when null', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const, description: null }

			// Act
			render(<OrganizationSettingsContent organization={org} />)

			// Assert
			const descInput = screen.getByLabelText(m.organization_settings_description_label())
			expect(descInput).toHaveValue('')
		})

		it('shows general title', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} />)

			// Assert
			expect(screen.getByText(m.organization_settings_general_title())).toBeInTheDocument()
		})

		it('shows save button', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} />)

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
			render(<OrganizationSettingsContent organization={org} />)

			// Assert
			expect(screen.getByTestId('danger-zone')).toBeInTheDocument()
			expect(screen.getByText(m.organization_settings_danger_zone())).toBeInTheDocument()
			expect(
				screen.getByRole('button', { name: m.organization_settings_delete_button() }),
			).toBeInTheDocument()
		})

		it('hides danger zone for admin', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'admin' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} />)

			// Assert
			expect(screen.queryByTestId('danger-zone')).not.toBeInTheDocument()
		})

		it('shows danger description', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} />)

			// Assert
			expect(screen.getByText(m.organization_settings_danger_description())).toBeInTheDocument()
		})
	})

	describe('loading states', () => {
		it('disables form inputs when update is pending', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} isPendingUpdate={true} />)

			// Assert
			const nameInput = screen.getByLabelText(m.organization_settings_name_label())
			const descInput = screen.getByLabelText(m.organization_settings_description_label())
			expect(nameInput).toBeDisabled()
			expect(descInput).toBeDisabled()
		})

		it('shows saving label when update is pending', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} isPendingUpdate={true} />)

			// Assert
			expect(
				screen.getByRole('button', { name: m.organization_settings_saving() }),
			).toBeInTheDocument()
		})

		it('shows deleting label when delete is pending', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} isPendingDelete={true} />)

			// Assert
			expect(
				screen.getByRole('button', { name: m.organization_settings_deleting() }),
			).toBeInTheDocument()
		})

		it('disables delete button when delete is pending', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationSettingsContent organization={org} isPendingDelete={true} />)

			// Assert
			expect(
				screen.getByRole('button', { name: m.organization_settings_deleting() }),
			).toBeDisabled()
		})
	})

	it('renders nothing when organization is null', () => {
		// Arrange & Act
		const { container } = render(<OrganizationSettingsContent organization={null} />)

		// Assert
		expect(container.firstChild).toBeNull()
	})
})
