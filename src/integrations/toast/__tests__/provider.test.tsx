import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ToastProvider from '../provider'

const { MockToaster } = vi.hoisted(() => ({
	MockToaster: vi.fn(() => <div data-testid="toaster" />),
}))

vi.mock('sonner', () => ({
	Toaster: MockToaster,
}))

describe('ToastProvider', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders children', () => {
		// Arrange & Act
		render(
			<ToastProvider>
				<div data-testid="child-content">Test Content</div>
			</ToastProvider>,
		)

		// Assert
		expect(screen.getByTestId('child-content')).toBeInTheDocument()
		expect(screen.getByText('Test Content')).toBeInTheDocument()
	})

	it('renders Toaster component on client side', () => {
		// Arrange & Act
		render(
			<ToastProvider>
				<div>App</div>
			</ToastProvider>,
		)

		// Assert
		expect(screen.getByTestId('toaster')).toBeInTheDocument()
	})

	it('configures Toaster with correct props', () => {
		// Arrange & Act
		render(
			<ToastProvider>
				<div>App</div>
			</ToastProvider>,
		)

		// Assert
		expect(MockToaster).toHaveBeenCalledWith(
			expect.objectContaining({
				position: 'top-right',
				duration: 4000,
				toastOptions: {
					className: 'border rounded-lg shadow-lg',
				},
			}),
			undefined,
		)
	})

	it('renders multiple children correctly', () => {
		// Arrange & Act
		render(
			<ToastProvider>
				<header data-testid="header">Header</header>
				<main data-testid="main">Main Content</main>
				<footer data-testid="footer">Footer</footer>
			</ToastProvider>,
		)

		// Assert
		expect(screen.getByTestId('header')).toBeInTheDocument()
		expect(screen.getByTestId('main')).toBeInTheDocument()
		expect(screen.getByTestId('footer')).toBeInTheDocument()
	})
})
