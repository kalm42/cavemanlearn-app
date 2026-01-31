import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import {
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRouter,
} from '@tanstack/react-router'
import { OrganizationCard } from '../OrganizationCard'
import type { OrganizationWithRole } from '@/hooks/useOrganizations'
import { m } from '@/paraglide/messages'

/**
 * ## createTestRouter
 *
 * Creates a minimal router for testing components that use TanStack Router's Link component.
 * Wraps the children in a router context with memory history.
 */
function createTestRouter(children: React.ReactNode) {
	const rootRoute = createRootRoute({
		component: () => children,
	})

	const router = createRouter({
		routeTree: rootRoute,
		history: createMemoryHistory(),
	})

	return router
}

/**
 * ## renderWithRouter
 *
 * Renders a component wrapped in a TanStack Router context for testing.
 */
function renderWithRouter(ui: React.ReactNode) {
	const router = createTestRouter(ui)
	return render(<RouterProvider router={router} />)
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

describe('OrganizationCard', () => {
	it('renders organization name', async () => {
		// Arrange
		renderWithRouter(<OrganizationCard organization={baseOrganization} />)

		// Assert
		await waitFor(() => {
			expect(screen.getByText('Test Organization')).toBeInTheDocument()
		})
	})

	it('renders organization description', async () => {
		// Arrange
		renderWithRouter(<OrganizationCard organization={baseOrganization} />)

		// Assert
		await waitFor(() => {
			expect(screen.getByText('A test organization description')).toBeInTheDocument()
		})
	})

	it('shows correct role badge for owner', async () => {
		// Arrange
		const org = { ...baseOrganization, role: 'owner' as const }
		renderWithRouter(<OrganizationCard organization={org} />)

		// Assert
		await waitFor(() => {
			expect(screen.getByText(m.organization_role_owner())).toBeInTheDocument()
		})
	})

	it('shows correct role badge for admin', async () => {
		// Arrange
		const org = { ...baseOrganization, role: 'admin' as const }
		renderWithRouter(<OrganizationCard organization={org} />)

		// Assert
		await waitFor(() => {
			expect(screen.getByText(m.organization_role_admin())).toBeInTheDocument()
		})
	})

	it('shows correct role badge for editor', async () => {
		// Arrange
		const org = { ...baseOrganization, role: 'editor' as const }
		renderWithRouter(<OrganizationCard organization={org} />)

		// Assert
		await waitFor(() => {
			expect(screen.getByText(m.organization_role_editor())).toBeInTheDocument()
		})
	})

	it('shows correct role badge for writer', async () => {
		// Arrange
		const org = { ...baseOrganization, role: 'writer' as const }
		renderWithRouter(<OrganizationCard organization={org} />)

		// Assert
		await waitFor(() => {
			expect(screen.getByText(m.organization_role_writer())).toBeInTheDocument()
		})
	})

	it('shows correct role badge for viewer', async () => {
		// Arrange
		const org = { ...baseOrganization, role: 'viewer' as const }
		renderWithRouter(<OrganizationCard organization={org} />)

		// Assert
		await waitFor(() => {
			expect(screen.getByText(m.organization_role_viewer())).toBeInTheDocument()
		})
	})

	it('renders logo image when logoUrl is provided', async () => {
		// Arrange
		const org = { ...baseOrganization, logoUrl: 'https://example.com/logo.png' }
		renderWithRouter(<OrganizationCard organization={org} />)

		// Assert
		await waitFor(() => {
			const img = screen.getByRole('img', { name: 'Test Organization' })
			expect(img).toBeInTheDocument()
			expect(img).toHaveAttribute('src', 'https://example.com/logo.png')
		})
	})

	it('renders placeholder icon when logoUrl is null', async () => {
		// Arrange
		const org = { ...baseOrganization, logoUrl: null }
		renderWithRouter(<OrganizationCard organization={org} />)

		// Assert
		await waitFor(() => {
			expect(screen.getByText('Test Organization')).toBeInTheDocument()
		})
		expect(screen.queryByRole('img', { name: 'Test Organization' })).not.toBeInTheDocument()
	})

	it('hides description when not provided', async () => {
		// Arrange
		const org = { ...baseOrganization, description: null }
		renderWithRouter(<OrganizationCard organization={org} />)

		// Assert
		await waitFor(() => {
			expect(screen.getByText('Test Organization')).toBeInTheDocument()
		})
		expect(screen.queryByText('A test organization description')).not.toBeInTheDocument()
	})

	it('links to organization dashboard', async () => {
		// Arrange
		renderWithRouter(<OrganizationCard organization={baseOrganization} />)

		// Assert
		await waitFor(() => {
			const link = screen.getByRole('link')
			expect(link).toHaveAttribute('href', '/publisher/organizations/test-org-id')
		})
	})

	it('displays member count', async () => {
		// Arrange
		const org = { ...baseOrganization, memberCount: 12 }
		renderWithRouter(<OrganizationCard organization={org} />)

		// Assert
		await waitFor(() => {
			expect(screen.getByText('12 members')).toBeInTheDocument()
		})
	})
})
