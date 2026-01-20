import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Suspense } from 'react'
import * as ClerkReact from '@clerk/clerk-react'
import { HttpResponse, http } from 'msw'
import { useSuspenseUserProfile } from '../useSuspenseUserProfile'
import { server } from '@/test/mocks/server'

vi.mock('@clerk/clerk-react')

describe('useSuspenseUserProfile', () => {
	let queryClient: QueryClient
	const mockGetToken = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
			},
		})
		vi.mocked(ClerkReact.useAuth).mockReturnValue({
			getToken: mockGetToken,
		} as never)
		mockGetToken.mockResolvedValue('mock-token')
	})

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>
			<Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
		</QueryClientProvider>
	)

	it('throws error when user is not authenticated', () => {
		// Arrange
		vi.mocked(ClerkReact.useUser).mockReturnValue({
			isSignedIn: false,
			isLoaded: true,
		} as never)

		// Act & Assert
		expect(() => {
			renderHook(() => useSuspenseUserProfile(), { wrapper })
		}).toThrow('Not authenticated')
	})

	it('returns null when profile does not exist', async () => {
		// Arrange
		vi.mocked(ClerkReact.useUser).mockReturnValue({
			isSignedIn: true,
			isLoaded: true,
		} as never)

		server.use(
			http.get('/api/user/profile', () => {
				return new HttpResponse(null, { status: 404 })
			}),
		)

		// Act
		const { result } = renderHook(() => useSuspenseUserProfile(), { wrapper })

		// Assert
		await waitFor(() => {
			expect(result.current.profile).toBeNull()
		})
	})

	it('returns profile when it exists', async () => {
		// Arrange
		vi.mocked(ClerkReact.useUser).mockReturnValue({
			isSignedIn: true,
			isLoaded: true,
		} as never)

		const mockProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_123',
			email: 'test@example.com',
			userType: 'learner' as const,
			displayName: null,
			avatarUrl: null,
			createdAt: new Date('2024-01-01').toISOString(),
			updatedAt: new Date('2024-01-01').toISOString(),
		}

		server.use(
			http.get('/api/user/profile', () => {
				return HttpResponse.json(mockProfile)
			}),
		)

		// Act
		const { result } = renderHook(() => useSuspenseUserProfile(), { wrapper })

		// Assert
		await waitFor(() => {
			expect(result.current.profile).toBeTruthy()
		})
		expect(result.current.profile).toMatchObject({
			clerkId: mockProfile.clerkId,
			email: mockProfile.email,
			userType: mockProfile.userType,
		})
	})
})
