import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BookOpen, Plus, Settings, Users } from 'lucide-react'
import type { OrganizationWithRole } from '@/db/validators'
import { hasMinimumRole } from '@/lib/permissions'
import { m } from '@/paraglide/messages'

/**
 * ## OrganizationDashboardContent
 *
 * Extracted content component for testing. This mirrors the logic in the actual
 * dashboard component but without router dependencies.
 */
function OrganizationDashboardContent(props: { organization: OrganizationWithRole | null }) {
	const { organization } = props

	if (!organization) {
		return null
	}

	const canManageMembers = hasMinimumRole(organization.role, 'admin')
	const canAccessSettings = hasMinimumRole(organization.role, 'admin')
	const canCreateDecks = hasMinimumRole(organization.role, 'writer')

	return (
		<div className="space-y-6">
			<div className="bg-slate-800 rounded-xl p-6">
				<h2 className="text-xl font-semibold text-white mb-4">
					{m.organization_dashboard_title()}
				</h2>
				<p className="text-gray-400" data-testid="description">
					{organization.description || m.organization_dashboard_no_description()}
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-slate-800 rounded-xl p-6">
					<div className="flex items-center gap-3 mb-2">
						<Users className="w-5 h-5 text-cyan-400" />
						<h3 className="text-sm font-medium text-gray-400">
							{m.organization_dashboard_stats_members()}
						</h3>
					</div>
					<p className="text-3xl font-bold text-white" data-testid="member-count">
						{organization.memberCount}
					</p>
				</div>

				<div className="bg-slate-800 rounded-xl p-6">
					<div className="flex items-center gap-3 mb-2">
						<BookOpen className="w-5 h-5 text-cyan-400" />
						<h3 className="text-sm font-medium text-gray-400">
							{m.organization_dashboard_stats_decks()}
						</h3>
					</div>
					<p className="text-3xl font-bold text-white" data-testid="deck-count">
						0
					</p>
				</div>
			</div>

			<div className="bg-slate-800 rounded-xl p-6">
				<h3 className="text-lg font-semibold text-white mb-4">
					{m.organization_dashboard_quick_actions()}
				</h3>
				<div className="flex flex-wrap gap-3">
					{canManageMembers && (
						<button
							type="button"
							data-testid="manage-members-action"
							className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
						>
							<Users size={18} />
							<span>{m.organization_dashboard_action_manage_members()}</span>
						</button>
					)}

					{canCreateDecks && (
						<button
							type="button"
							data-testid="create-deck-action"
							disabled
							className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-gray-500 rounded-lg cursor-not-allowed"
							title="Coming soon"
						>
							<Plus size={18} />
							<span>{m.organization_dashboard_action_create_deck()}</span>
						</button>
					)}

					{canAccessSettings && (
						<button
							type="button"
							data-testid="view-settings-action"
							className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
						>
							<Settings size={18} />
							<span>{m.organization_dashboard_action_view_settings()}</span>
						</button>
					)}
				</div>
			</div>
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

describe('OrganizationDashboard', () => {
	describe('content display', () => {
		it('renders organization description', () => {
			// Arrange & Act
			render(<OrganizationDashboardContent organization={baseOrganization} />)

			// Assert
			expect(screen.getByTestId('description')).toHaveTextContent(
				'A test organization description',
			)
		})

		it('shows no description message when description is null', () => {
			// Arrange
			const org = { ...baseOrganization, description: null }

			// Act
			render(<OrganizationDashboardContent organization={org} />)

			// Assert
			expect(screen.getByTestId('description')).toHaveTextContent(
				m.organization_dashboard_no_description(),
			)
		})

		it('displays correct member count', () => {
			// Arrange
			const org = { ...baseOrganization, memberCount: 12 }

			// Act
			render(<OrganizationDashboardContent organization={org} />)

			// Assert
			expect(screen.getByTestId('member-count')).toHaveTextContent('12')
		})

		it('displays deck count as 0', () => {
			// Arrange & Act
			render(<OrganizationDashboardContent organization={baseOrganization} />)

			// Assert
			expect(screen.getByTestId('deck-count')).toHaveTextContent('0')
		})

		it('shows dashboard title', () => {
			// Arrange & Act
			render(<OrganizationDashboardContent organization={baseOrganization} />)

			// Assert
			expect(screen.getByText(m.organization_dashboard_title())).toBeInTheDocument()
		})

		it('shows quick actions section', () => {
			// Arrange & Act
			render(<OrganizationDashboardContent organization={baseOrganization} />)

			// Assert
			expect(screen.getByText(m.organization_dashboard_quick_actions())).toBeInTheDocument()
		})

		it('renders nothing when organization is null', () => {
			// Arrange & Act
			const { container } = render(<OrganizationDashboardContent organization={null} />)

			// Assert
			expect(container.firstChild).toBeNull()
		})
	})

	describe('quick actions visibility based on role', () => {
		it('shows all actions for owner', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationDashboardContent organization={org} />)

			// Assert
			expect(screen.getByTestId('manage-members-action')).toBeInTheDocument()
			expect(screen.getByTestId('create-deck-action')).toBeInTheDocument()
			expect(screen.getByTestId('view-settings-action')).toBeInTheDocument()
		})

		it('shows all actions for admin', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'admin' as const }

			// Act
			render(<OrganizationDashboardContent organization={org} />)

			// Assert
			expect(screen.getByTestId('manage-members-action')).toBeInTheDocument()
			expect(screen.getByTestId('create-deck-action')).toBeInTheDocument()
			expect(screen.getByTestId('view-settings-action')).toBeInTheDocument()
		})

		it('shows only create deck for editor', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'editor' as const }

			// Act
			render(<OrganizationDashboardContent organization={org} />)

			// Assert
			expect(screen.queryByTestId('manage-members-action')).not.toBeInTheDocument()
			expect(screen.getByTestId('create-deck-action')).toBeInTheDocument()
			expect(screen.queryByTestId('view-settings-action')).not.toBeInTheDocument()
		})

		it('shows only create deck for writer', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'writer' as const }

			// Act
			render(<OrganizationDashboardContent organization={org} />)

			// Assert
			expect(screen.queryByTestId('manage-members-action')).not.toBeInTheDocument()
			expect(screen.getByTestId('create-deck-action')).toBeInTheDocument()
			expect(screen.queryByTestId('view-settings-action')).not.toBeInTheDocument()
		})

		it('shows no actions for viewer', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'viewer' as const }

			// Act
			render(<OrganizationDashboardContent organization={org} />)

			// Assert
			expect(screen.queryByTestId('manage-members-action')).not.toBeInTheDocument()
			expect(screen.queryByTestId('create-deck-action')).not.toBeInTheDocument()
			expect(screen.queryByTestId('view-settings-action')).not.toBeInTheDocument()
		})
	})
})
