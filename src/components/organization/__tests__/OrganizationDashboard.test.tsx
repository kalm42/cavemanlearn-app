import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrganizationDashboard } from '../OrganizationDashboard'
import type { OrganizationWithRole } from '@/db/validators'
import { m } from '@/paraglide/messages'

vi.mock('@tanstack/react-router', () => ({
	Link: (props: {
		to: string
		params?: Record<string, string>
		children: React.ReactNode
		className?: string
	}) => {
		const href = props.params
			? props.to.replace(/\$(\w+)/g, (_, key) => props.params?.[key] ?? '')
			: props.to
		return (
			<a href={href} className={props.className}>
				{props.children}
			</a>
		)
	},
}))

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
			render(<OrganizationDashboard organization={baseOrganization} />)

			// Assert
			expect(screen.getByText('A test organization description')).toBeInTheDocument()
		})

		it('shows no description message when description is null', () => {
			// Arrange
			const org = { ...baseOrganization, description: null }

			// Act
			render(<OrganizationDashboard organization={org} />)

			// Assert
			expect(screen.getByText(m.organization_dashboard_no_description())).toBeInTheDocument()
		})

		it('displays correct member count', () => {
			// Arrange
			const org = { ...baseOrganization, memberCount: 12 }

			// Act
			render(<OrganizationDashboard organization={org} />)

			// Assert
			expect(screen.getByText('12')).toBeInTheDocument()
		})

		it('displays deck count as 0', () => {
			// Arrange & Act
			render(<OrganizationDashboard organization={baseOrganization} />)

			// Assert
			const deckSection = screen.getByText(m.organization_dashboard_stats_decks()).closest('div')
			expect(deckSection?.parentElement).toHaveTextContent('0')
		})

		it('shows dashboard title', () => {
			// Arrange & Act
			render(<OrganizationDashboard organization={baseOrganization} />)

			// Assert
			expect(screen.getByText(m.organization_dashboard_title())).toBeInTheDocument()
		})

		it('shows quick actions section', () => {
			// Arrange & Act
			render(<OrganizationDashboard organization={baseOrganization} />)

			// Assert
			expect(screen.getByText(m.organization_dashboard_quick_actions())).toBeInTheDocument()
		})
	})

	describe('quick actions visibility based on role', () => {
		it('shows all actions for owner', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(<OrganizationDashboard organization={org} />)

			// Assert
			expect(screen.getByRole('link', { name: /manage members/i })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /create deck/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /view settings/i })).toBeInTheDocument()
		})

		it('shows all actions for admin', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'admin' as const }

			// Act
			render(<OrganizationDashboard organization={org} />)

			// Assert
			expect(screen.getByRole('link', { name: /manage members/i })).toBeInTheDocument()
			expect(screen.getByRole('button', { name: /create deck/i })).toBeInTheDocument()
			expect(screen.getByRole('link', { name: /view settings/i })).toBeInTheDocument()
		})

		it('shows only create deck for editor', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'editor' as const }

			// Act
			render(<OrganizationDashboard organization={org} />)

			// Assert
			expect(screen.getByRole('button', { name: /create deck/i })).toBeInTheDocument()
			expect(screen.queryByRole('link', { name: /manage members/i })).not.toBeInTheDocument()
			expect(screen.queryByRole('link', { name: /view settings/i })).not.toBeInTheDocument()
		})

		it('shows only create deck for writer', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'writer' as const }

			// Act
			render(<OrganizationDashboard organization={org} />)

			// Assert
			expect(screen.getByRole('button', { name: /create deck/i })).toBeInTheDocument()
			expect(screen.queryByRole('link', { name: /manage members/i })).not.toBeInTheDocument()
			expect(screen.queryByRole('link', { name: /view settings/i })).not.toBeInTheDocument()
		})

		it('shows no actions for viewer', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'viewer' as const }

			// Act
			render(<OrganizationDashboard organization={org} />)

			// Assert
			expect(screen.queryByRole('link', { name: /manage members/i })).not.toBeInTheDocument()
			expect(screen.queryByRole('button', { name: /create deck/i })).not.toBeInTheDocument()
			expect(screen.queryByRole('link', { name: /view settings/i })).not.toBeInTheDocument()
		})
	})

	describe('create deck button', () => {
		it('is disabled with coming soon badge', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'writer' as const }

			// Act
			render(<OrganizationDashboard organization={org} />)

			// Assert
			const button = screen.getByRole('button', { name: /create deck/i })
			expect(button).toBeDisabled()
			expect(screen.getByText(m.coming_soon())).toBeInTheDocument()
		})
	})
})
