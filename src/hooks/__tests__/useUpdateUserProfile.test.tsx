import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as ClerkReact from '@clerk/clerk-react'
import { HttpResponse, http } from 'msw'
import { useUpdateUserProfile } from '../useUpdateUserProfile'
import { server } from '@/test/mocks/server'

vi.mock('@clerk/clerk-react')

describe('useUpdateUserProfile', () => {
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

	const wrapper = (props: { children: React.ReactNode }) => {
		const { children } = props

		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	}

	it('updates profile successfully', async () => {
		// Arrange
		const mockProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_123',
			email: 'test@example.com',
			userType: 'learner' as const,
			displayName: 'Updated Name',
			avatarUrl: null,
			createdAt: new Date('2024-01-01').toISOString(),
			updatedAt: new Date('2024-01-02').toISOString(),
		}

		server.use(
			http.put('/api/user/profile', () => {
				return HttpResponse.json(mockProfile, { status: 200 })
			}),
		)

		const onSuccess = vi.fn()

		// Act
		const { result } = renderHook(() => useUpdateUserProfile({ onSuccess }), { wrapper })

		await result.current.mutateAsync({ displayName: 'Updated Name' })

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})
		expect(onSuccess).toHaveBeenCalledTimes(1)
		expect(onSuccess).toHaveBeenCalledWith(
			expect.objectContaining({
				displayName: 'Updated Name',
			}),
		)
	})

	it('throws error when not authenticated', async () => {
		// Arrange
		mockGetToken.mockResolvedValue(null)

		// Act
		const { result } = renderHook(() => useUpdateUserProfile(), { wrapper })

		// Assert
		await expect(result.current.mutateAsync({ displayName: 'New Name' })).rejects.toThrow(
			'Not authenticated',
		)
	})

	it('handles API error response', async () => {
		// Arrange
		server.use(
			http.put('/api/user/profile', () => {
				return HttpResponse.json({ error: 'Profile not found' }, { status: 404 })
			}),
		)

		// Act
		const { result } = renderHook(() => useUpdateUserProfile(), { wrapper })

		// Assert
		await expect(result.current.mutateAsync({ displayName: 'New Name' })).rejects.toThrow(
			'Profile not found',
		)
	})

	it('handles validation error response', async () => {
		// Arrange
		server.use(
			http.put('/api/user/profile', () => {
				return HttpResponse.json(
					{ error: 'At least one field (displayName or avatarUrl) must be provided' },
					{ status: 400 },
				)
			}),
		)

		// Act
		const { result } = renderHook(() => useUpdateUserProfile(), { wrapper })

		// Assert
		await expect(result.current.mutateAsync({})).rejects.toThrow(
			'At least one field (displayName or avatarUrl) must be provided',
		)
	})

	it('updates profile with avatarUrl', async () => {
		// Arrange
		const mockProfile = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			clerkId: 'user_123',
			email: 'test@example.com',
			userType: 'learner' as const,
			displayName: 'John Doe',
			avatarUrl: 'https://example.com/new-avatar.png',
			createdAt: new Date('2024-01-01').toISOString(),
			updatedAt: new Date('2024-01-02').toISOString(),
		}

		server.use(
			http.put('/api/user/profile', () => {
				return HttpResponse.json(mockProfile, { status: 200 })
			}),
		)

		// Act
		const { result } = renderHook(() => useUpdateUserProfile(), { wrapper })

		await result.current.mutateAsync({ avatarUrl: 'https://example.com/new-avatar.png' })

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})
	})

	it('handles network error', async () => {
		// Arrange
		server.use(
			http.put('/api/user/profile', () => {
				return HttpResponse.error()
			}),
		)

		// Act
		const { result } = renderHook(() => useUpdateUserProfile(), { wrapper })

		// Assert
		await expect(result.current.mutateAsync({ displayName: 'New Name' })).rejects.toThrow()
	})
})
