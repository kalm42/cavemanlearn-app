import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as ClerkReact from '@clerk/clerk-react'
import { HttpResponse, http } from 'msw'
import { useDeleteOrganization } from '../useDeleteOrganization'
import { server } from '@/test/mocks/server'

vi.mock('@clerk/clerk-react')

describe('useDeleteOrganization', () => {
	let queryClient: QueryClient
	const mockGetToken = vi.fn()
	const orgId = '550e8400-e29b-41d4-a716-446655440000'

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

	it('deletes organization successfully', async () => {
		// Arrange
		server.use(
			http.delete(`/api/organizations/${orgId}`, () => {
				return new HttpResponse(null, { status: 204 })
			}),
		)

		const onSuccess = vi.fn()

		// Act
		const { result } = renderHook(() => useDeleteOrganization(orgId, { onSuccess }), { wrapper })

		await result.current.mutateAsync()

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})
		expect(onSuccess).toHaveBeenCalledTimes(1)
	})

	it('throws ApiError with NOT_AUTHENTICATED code when not authenticated', async () => {
		// Arrange
		mockGetToken.mockResolvedValue(null)
		const { result } = renderHook(() => useDeleteOrganization(orgId), { wrapper })

		// Act & Assert
		await expect(result.current.mutateAsync()).rejects.toMatchObject({
			code: 'NOT_AUTHENTICATED',
		})
	})

	it('throws ApiError with FORBIDDEN code for non-owners', async () => {
		// Arrange
		server.use(
			http.delete(`/api/organizations/${orgId}`, () => {
				return HttpResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
			}),
		)
		const { result } = renderHook(() => useDeleteOrganization(orgId), { wrapper })

		// Act & Assert
		await expect(result.current.mutateAsync()).rejects.toMatchObject({
			code: 'FORBIDDEN',
		})
	})

	it('invalidates organizations query and removes organization query on success', async () => {
		// Arrange
		server.use(
			http.delete(`/api/organizations/${orgId}`, () => {
				return new HttpResponse(null, { status: 204 })
			}),
		)

		const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')
		const removeQueriesSpy = vi.spyOn(queryClient, 'removeQueries')

		// Act
		const { result } = renderHook(() => useDeleteOrganization(orgId), { wrapper })

		await result.current.mutateAsync()

		// Assert
		await waitFor(() => {
			expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['organizations'] })
			expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ['organization', orgId] })
		})
	})

	it('throws ApiError with UNKNOWN_ERROR for non-JSON error responses', async () => {
		// Arrange
		server.use(
			http.delete(`/api/organizations/${orgId}`, () => {
				return new HttpResponse('Internal Server Error', { status: 500 })
			}),
		)
		const { result } = renderHook(() => useDeleteOrganization(orgId), { wrapper })

		// Act & Assert
		await expect(result.current.mutateAsync()).rejects.toMatchObject({
			code: 'UNKNOWN_ERROR',
		})
	})
})
