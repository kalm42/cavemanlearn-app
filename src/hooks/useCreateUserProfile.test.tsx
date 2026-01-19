import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as ClerkReact from '@clerk/clerk-react'
import { HttpResponse, http } from 'msw'
import { useCreateUserProfile } from './useCreateUserProfile'
import { server } from '@/test/mocks/server'

vi.mock('@clerk/clerk-react')

describe('useCreateUserProfile', () => {
	let queryClient: QueryClient
	const mockGetToken = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		queryClient = new QueryClient({
			defaultOptions: {
				queries: { retry: false },
				mutations: { retry: false },
			},
		})
		vi.mocked(ClerkReact.useAuth).mockReturnValue({
			getToken: mockGetToken,
		} as never)
		mockGetToken.mockResolvedValue('mock-token')
		server.resetHandlers()
	})

	const wrapper = ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)

	it('creates profile successfully', async () => {
		// Arrange
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
			http.post('/api/user/profile', () => {
				return HttpResponse.json(mockProfile, { status: 201 })
			}),
		)

		const onSuccess = vi.fn()

		// Act
		const { result } = renderHook(() => useCreateUserProfile({ onSuccess }), { wrapper })

		await result.current.mutateAsync('learner')

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})
		expect(onSuccess).toHaveBeenCalledTimes(1)
	})

	it('throws error when not authenticated', async () => {
		// Arrange
		mockGetToken.mockResolvedValue(null)

		// Act
		const { result } = renderHook(() => useCreateUserProfile(), { wrapper })

		// Assert
		await expect(result.current.mutateAsync('learner')).rejects.toThrow('Not authenticated')
	})

	it('handles API error response', async () => {
		// Arrange
		server.use(
			http.post('/api/user/profile', () => {
				return HttpResponse.json({ error: 'Profile already exists' }, { status: 409 })
			}),
		)

		// Act
		const { result } = renderHook(() => useCreateUserProfile(), { wrapper })

		// Assert
		await expect(result.current.mutateAsync('learner')).rejects.toThrow('Profile already exists')
	})
})
