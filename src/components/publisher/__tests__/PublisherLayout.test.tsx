import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PublisherAccessDenied, PublisherLayout } from '../PublisherLayout'
import { m } from '@/paraglide/messages'

vi.mock('@tanstack/react-router', () => ({
	Link: (props: {
		to: string
		children: React.ReactNode
		className?: string
		activeProps?: { className?: string }
	}) => (
		<a href={props.to} className={props.className}>
			{props.children}
		</a>
	),
}))

describe('PublisherLayout', () => {
	describe('navigation', () => {
		it('shows organizations link', () => {
			// Arrange & Act
			render(
				<PublisherLayout>
					<div>Child content</div>
				</PublisherLayout>,
			)

			// Assert
			expect(
				screen.getByRole('link', { name: new RegExp(m.publisher_nav_organizations(), 'i') }),
			).toBeInTheDocument()
		})

		it('shows back to home link', () => {
			// Arrange & Act
			render(
				<PublisherLayout>
					<div>Child content</div>
				</PublisherLayout>,
			)

			// Assert
			expect(
				screen.getByRole('link', { name: new RegExp(m.publisher_back_to_home(), 'i') }),
			).toBeInTheDocument()
		})

		it('shows publisher dashboard title', () => {
			// Arrange & Act
			render(
				<PublisherLayout>
					<div>Child content</div>
				</PublisherLayout>,
			)

			// Assert
			expect(screen.getByText(m.publisher_page_title())).toBeInTheDocument()
		})
	})

	describe('children', () => {
		it('renders children content', () => {
			// Arrange & Act
			render(
				<PublisherLayout>
					<div data-testid="child-content">Child content</div>
				</PublisherLayout>,
			)

			// Assert
			expect(screen.getByTestId('child-content')).toBeInTheDocument()
		})
	})
})

describe('PublisherAccessDenied', () => {
	it('shows access denied title', () => {
		// Arrange & Act
		render(<PublisherAccessDenied />)

		// Assert
		expect(screen.getByText(m.publisher_access_denied_title())).toBeInTheDocument()
	})

	it('shows access denied description', () => {
		// Arrange & Act
		render(<PublisherAccessDenied />)

		// Assert
		expect(screen.getByText(m.publisher_access_denied_description())).toBeInTheDocument()
	})

	it('shows back to home link', () => {
		// Arrange & Act
		render(<PublisherAccessDenied />)

		// Assert
		expect(
			screen.getByRole('link', { name: new RegExp(m.publisher_back_to_home(), 'i') }),
		).toBeInTheDocument()
	})
})
