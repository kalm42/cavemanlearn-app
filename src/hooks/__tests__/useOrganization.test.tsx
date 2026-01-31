import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as ClerkReact from '@clerk/clerk-react'
import { HttpResponse, http } from 'msw'
import { useOrganization } from '../useOrganization'
import { server } from '@/test/mocks/server'

vi.mock('@clerk/clerk-react')

describe('useOrganization', () => {
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
		vi.mocked(ClerkReact.useUser).mockReturnValue({
			isSignedIn: true,
			isLoaded: true,
		} as never)
		mockGetToken.mockResolvedValue('mock-token')
		server.resetHandlers()
	})

	const wrapper = (props: { children: React.ReactNode }) => {
		const { children } = props

		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	}

	it('fetches organization successfully', async () => {
		// Arrange
		const mockOrganization = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'Test Org',
			slug: 'test-org',
			description: 'A test organization',
			logoUrl: null,
			createdAt: new Date('2024-01-01').toISOString(),
			updatedAt: new Date('2024-01-01').toISOString(),
			role: 'owner' as const,
			memberCount: 3,
		}

		server.use(
			http.get('/api/organizations/:orgId', () => {
				return HttpResponse.json({ organization: mockOrganization })
			}),
		)

		// Act
		const { result } = renderHook(() => useOrganization('550e8400-e29b-41d4-a716-446655440000'), {
			wrapper,
		})

		// Assert
		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})
		expect(result.current.organization?.id).toBe(mockOrganization.id)
		expect(result.current.organization?.name).toBe(mockOrganization.name)
		expect(result.current.organization?.role).toBe('owner')
		expect(result.current.organization?.memberCount).toBe(3)
	})

	it('returns null for 404 response', async () => {
		// Arrange
		server.use(
			http.get('/api/organizations/:orgId', () => {
				return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
			}),
		)

		// Act
		const { result } = renderHook(() => useOrganization('550e8400-e29b-41d4-a716-446655440000'), {
			wrapper,
		})

		// Assert
		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})
		expect(result.current.organization).toBeNull()
	})

	it('returns null for 403 response', async () => {
		// Arrange
		server.use(
			http.get('/api/organizations/:orgId', () => {
				return HttpResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
			}),
		)

		// Act
		const { result } = renderHook(() => useOrganization('550e8400-e29b-41d4-a716-446655440000'), {
			wrapper,
		})

		// Assert
		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})
		expect(result.current.organization).toBeNull()
	})

	it('throws error for other error responses', async () => {
		// Arrange
		server.use(
			http.get('/api/organizations/:orgId', () => {
				return HttpResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
			}),
		)

		// Act
		const { result } = renderHook(() => useOrganization('550e8400-e29b-41d4-a716-446655440000'), {
			wrapper,
		})

		// Assert
		await waitFor(() => {
			expect(result.current.error).not.toBeNull()
		})
	})

	it('does not fetch when user is not signed in', async () => {
		// Arrange
		vi.mocked(ClerkReact.useUser).mockReturnValue({
			isSignedIn: false,
			isLoaded: true,
		} as never)

		let requestCount = 0
		server.use(
			http.get('/api/organizations/:orgId', () => {
				requestCount++
				return HttpResponse.json({ organization: {} })
			}),
		)

		// Act
		renderHook(() => useOrganization('550e8400-e29b-41d4-a716-446655440000'), { wrapper })

		// Wait a bit to ensure no request is made
		await new Promise((resolve) => {
			setTimeout(resolve, 100)
		})

		// Assert
		expect(requestCount).toBe(0)
	})
})
