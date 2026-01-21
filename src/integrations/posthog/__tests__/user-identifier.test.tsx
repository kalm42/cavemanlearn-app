import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import * as ClerkReact from '@clerk/clerk-react'
import { PostHogProvider } from 'posthog-js/react'
import PostHogUserIdentifier from '../user-identifier'

vi.mock('@clerk/clerk-react')

const { mockIdentify, mockReset, mockPosthog } = vi.hoisted(() => {
	const identify = vi.fn()
	const reset = vi.fn()
	return {
		mockIdentify: identify,
		mockReset: reset,
		mockPosthog: {
			identify,
			reset,
			capture: vi.fn(),
			init: vi.fn(),
			__loaded: true,
		},
	}
})

vi.mock('posthog-js', () => ({
	default: mockPosthog,
}))

vi.mock('posthog-js/react', () => ({
	PostHogProvider: (props: { children: React.ReactNode }) => props.children,
	usePostHog: () => mockPosthog,
}))

describe('PostHogUserIdentifier', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('identifies user when signed in', async () => {
		// Arrange
		const mockUser = {
			id: 'user_123',
			primaryEmailAddress: { emailAddress: 'test@example.com' },
			fullName: 'Test User',
			firstName: 'Test',
			lastName: 'User',
			username: 'testuser',
			createdAt: new Date('2024-01-01'),
		}

		vi.mocked(ClerkReact.useUser).mockReturnValue({
			user: mockUser,
			isSignedIn: true,
			isLoaded: true,
		} as never)

		// Act
		render(
			<PostHogProvider client={mockPosthog as never}>
				<PostHogUserIdentifier />
			</PostHogProvider>,
		)

		// Assert
		await waitFor(() => {
			expect(mockIdentify).toHaveBeenCalledWith('user_123', {
				email: 'test@example.com',
				name: 'Test User',
				firstName: 'Test',
				lastName: 'User',
				username: 'testuser',
				createdAt: '2024-01-01T00:00:00.000Z',
			})
		})
	})

	it('resets identity when signed out', async () => {
		// Arrange
		vi.mocked(ClerkReact.useUser).mockReturnValue({
			user: null,
			isSignedIn: false,
			isLoaded: true,
		} as never)

		// Act
		render(
			<PostHogProvider client={mockPosthog as never}>
				<PostHogUserIdentifier />
			</PostHogProvider>,
		)

		// Assert
		await waitFor(() => {
			expect(mockReset).toHaveBeenCalled()
		})
	})

	it('does not call identify or reset while loading', () => {
		// Arrange
		vi.mocked(ClerkReact.useUser).mockReturnValue({
			user: null,
			isSignedIn: false,
			isLoaded: false,
		} as never)

		// Act
		render(
			<PostHogProvider client={mockPosthog as never}>
				<PostHogUserIdentifier />
			</PostHogProvider>,
		)

		// Assert
		expect(mockIdentify).not.toHaveBeenCalled()
		expect(mockReset).not.toHaveBeenCalled()
	})
})
