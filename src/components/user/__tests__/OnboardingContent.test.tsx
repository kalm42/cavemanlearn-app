import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import { OnboardingContent } from '../OnboardingContent'
import { useSuspenseUserProfile } from '@/hooks/useSuspenseUserProfile'

vi.mock('@clerk/clerk-react')
vi.mock('@/hooks/useSuspenseUserProfile')
vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => vi.fn(),
}))

describe('OnboardingContent', () => {
	let queryClient: QueryClient
	const mockNavigate = vi.fn()
	const mockMutateAsync = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		})
		mockMutateAsync.mockResolvedValue({
			clerkId: 'user_123',
			email: 'test@example.com',
			userType: 'learner',
		})
	})

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
		</QueryClientProvider>
	)

	it('renders onboarding form when profile does not exist', () => {
		// Arrange
		vi.mocked(useSuspenseUserProfile).mockReturnValue({
			profile: null,
		})

		const mockMutation = {
			mutateAsync: mockMutateAsync,
			isPending: false,
			error: null,
		}

		// Act
		render(
			<OnboardingContent navigate={mockNavigate} createProfileMutation={mockMutation as never} />,
			{ wrapper },
		)

		// Assert
		expect(screen.getByRole('heading', { name: /welcome to cavemanlearn/i })).toBeInTheDocument()
	})

	it('redirects when profile exists', async () => {
		// Arrange
		vi.mocked(useSuspenseUserProfile).mockReturnValue({
			profile: {
				id: '550e8400-e29b-41d4-a716-446655440000',
				clerkId: 'user_123',
				email: 'test@example.com',
				userType: 'learner',
				displayName: null,
				avatarUrl: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		})

		const mockMutation = {
			mutateAsync: mockMutateAsync,
			isPending: false,
			error: null,
		}

		// Act
		render(
			<OnboardingContent navigate={mockNavigate} createProfileMutation={mockMutation as never} />,
			{ wrapper },
		)

		// Assert
		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
		})
	})

	it('displays error when mutation has error', () => {
		// Arrange
		vi.mocked(useSuspenseUserProfile).mockReturnValue({
			profile: null,
		})

		const mockMutation = {
			mutateAsync: mockMutateAsync,
			isPending: false,
			error: new Error('Profile already exists'),
		}

		// Act
		render(
			<OnboardingContent navigate={mockNavigate} createProfileMutation={mockMutation as never} />,
			{ wrapper },
		)

		// Assert
		expect(screen.getByText(/profile already exists/i)).toBeInTheDocument()
	})
})
