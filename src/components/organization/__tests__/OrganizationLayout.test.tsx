import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrganizationLayout, OrganizationNotFound } from '../OrganizationLayout'
import type { OrganizationWithRole } from '@/db/validators'
import { m } from '@/paraglide/messages'

vi.mock('@tanstack/react-router', () => ({
	Link: (props: {
		to: string
		params?: Record<string, string>
		children: React.ReactNode
		className?: string
		activeProps?: { className?: string }
		activeOptions?: { exact?: boolean }
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

describe('OrganizationLayout', () => {
	describe('header', () => {
		it('displays organization name', () => {
			// Arrange & Act
			render(
				<OrganizationLayout organization={baseOrganization}>
					<div>Child content</div>
				</OrganizationLayout>,
			)

			// Assert
			expect(screen.getByText('Test Organization')).toBeInTheDocument()
		})

		it('displays organization slug', () => {
			// Arrange & Act
			render(
				<OrganizationLayout organization={baseOrganization}>
					<div>Child content</div>
				</OrganizationLayout>,
			)

			// Assert
			expect(screen.getByText('test-organization')).toBeInTheDocument()
		})

		it('shows placeholder when no logo', () => {
			// Arrange & Act
			render(
				<OrganizationLayout organization={baseOrganization}>
					<div>Child content</div>
				</OrganizationLayout>,
			)

			// Assert
			expect(screen.getByText('T')).toBeInTheDocument()
		})

		it('shows logo when provided', () => {
			// Arrange
			const org = { ...baseOrganization, logoUrl: 'https://example.com/logo.png' }

			// Act
			render(
				<OrganizationLayout organization={org}>
					<div>Child content</div>
				</OrganizationLayout>,
			)

			// Assert
			const img = screen.getByRole('img', { name: 'Test Organization' })
			expect(img).toHaveAttribute('src', 'https://example.com/logo.png')
		})
	})

	describe('navigation', () => {
		it('shows dashboard link', () => {
			// Arrange & Act
			render(
				<OrganizationLayout organization={baseOrganization}>
					<div>Child content</div>
				</OrganizationLayout>,
			)

			// Assert
			expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
		})

		it('shows members link', () => {
			// Arrange & Act
			render(
				<OrganizationLayout organization={baseOrganization}>
					<div>Child content</div>
				</OrganizationLayout>,
			)

			// Assert
			expect(screen.getByRole('link', { name: /members/i })).toBeInTheDocument()
		})

		it('shows settings link for owner', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'owner' as const }

			// Act
			render(
				<OrganizationLayout organization={org}>
					<div>Child content</div>
				</OrganizationLayout>,
			)

			// Assert
			expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
		})

		it('shows settings link for admin', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'admin' as const }

			// Act
			render(
				<OrganizationLayout organization={org}>
					<div>Child content</div>
				</OrganizationLayout>,
			)

			// Assert
			expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
		})

		it('hides settings link for editor', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'editor' as const }

			// Act
			render(
				<OrganizationLayout organization={org}>
					<div>Child content</div>
				</OrganizationLayout>,
			)

			// Assert
			expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument()
		})

		it('hides settings link for writer', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'writer' as const }

			// Act
			render(
				<OrganizationLayout organization={org}>
					<div>Child content</div>
				</OrganizationLayout>,
			)

			// Assert
			expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument()
		})

		it('hides settings link for viewer', () => {
			// Arrange
			const org = { ...baseOrganization, role: 'viewer' as const }

			// Act
			render(
				<OrganizationLayout organization={org}>
					<div>Child content</div>
				</OrganizationLayout>,
			)

			// Assert
			expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument()
		})

		it('shows back to organizations link', () => {
			// Arrange & Act
			render(
				<OrganizationLayout organization={baseOrganization}>
					<div>Child content</div>
				</OrganizationLayout>,
			)

			// Assert
			expect(
				screen.getByRole('link', { name: new RegExp(m.organization_back_to_list(), 'i') }),
			).toBeInTheDocument()
		})
	})

	describe('children', () => {
		it('renders children content', () => {
			// Arrange & Act
			render(
				<OrganizationLayout organization={baseOrganization}>
					<div data-testid="child-content">Child content</div>
				</OrganizationLayout>,
			)

			// Assert
			expect(screen.getByTestId('child-content')).toBeInTheDocument()
		})
	})
})

describe('OrganizationNotFound', () => {
	it('shows not found message', () => {
		// Arrange & Act
		render(<OrganizationNotFound />)

		// Assert
		expect(screen.getByText(m.organization_not_found())).toBeInTheDocument()
	})

	it('shows access denied message', () => {
		// Arrange & Act
		render(<OrganizationNotFound />)

		// Assert
		expect(screen.getByText(m.organization_access_denied())).toBeInTheDocument()
	})

	it('shows back link', () => {
		// Arrange & Act
		render(<OrganizationNotFound />)

		// Assert
		expect(
			screen.getByRole('link', { name: new RegExp(m.organization_back_to_list(), 'i') }),
		).toBeInTheDocument()
	})
})
