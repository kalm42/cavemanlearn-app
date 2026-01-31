import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as ClerkReact from '@clerk/clerk-react'
import { HttpResponse, http } from 'msw'
import { useUpdateOrganization } from '../useUpdateOrganization'
import { server } from '@/test/mocks/server'

vi.mock('@clerk/clerk-react')

describe('useUpdateOrganization', () => {
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

	it('updates organization successfully', async () => {
		// Arrange
		const mockOrganization = {
			id: orgId,
			name: 'Updated Org',
			slug: 'updated-org',
			description: 'Updated description',
			logoUrl: null,
			createdAt: new Date('2024-01-01').toISOString(),
			updatedAt: new Date('2024-01-02').toISOString(),
		}

		server.use(
			http.put(`/api/organizations/${orgId}`, () => {
				return HttpResponse.json({ organization: mockOrganization })
			}),
		)

		const onSuccess = vi.fn()

		// Act
		const { result } = renderHook(() => useUpdateOrganization(orgId, { onSuccess }), { wrapper })

		await result.current.mutateAsync({
			name: 'Updated Org',
			description: 'Updated description',
		})

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})
		expect(onSuccess).toHaveBeenCalledTimes(1)
		const callArg = onSuccess.mock.calls[0]?.[0] as { organization: { name: string } }
		expect(callArg.organization.name).toBe('Updated Org')
	})

	it('throws ApiError with NOT_AUTHENTICATED code when not authenticated', async () => {
		// Arrange
		mockGetToken.mockResolvedValue(null)
		const { result } = renderHook(() => useUpdateOrganization(orgId), { wrapper })

		// Act & Assert
		await expect(result.current.mutateAsync({ name: 'Updated Org' })).rejects.toMatchObject({
			code: 'NOT_AUTHENTICATED',
		})
	})

	it('throws ApiError with FORBIDDEN code for unauthorized users', async () => {
		// Arrange
		server.use(
			http.put(`/api/organizations/${orgId}`, () => {
				return HttpResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
			}),
		)
		const { result } = renderHook(() => useUpdateOrganization(orgId), { wrapper })

		// Act & Assert
		await expect(result.current.mutateAsync({ name: 'Updated Org' })).rejects.toMatchObject({
			code: 'FORBIDDEN',
		})
	})

	it('invalidates both organizations and organization queries on success', async () => {
		// Arrange
		const mockOrganization = {
			id: orgId,
			name: 'Updated Org',
			slug: 'updated-org',
			description: null,
			logoUrl: null,
			createdAt: new Date('2024-01-01').toISOString(),
			updatedAt: new Date('2024-01-02').toISOString(),
		}

		server.use(
			http.put(`/api/organizations/${orgId}`, () => {
				return HttpResponse.json({ organization: mockOrganization })
			}),
		)

		const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

		// Act
		const { result } = renderHook(() => useUpdateOrganization(orgId), { wrapper })

		await result.current.mutateAsync({ name: 'Updated Org' })

		// Assert
		await waitFor(() => {
			expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['organizations'] })
			expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['organization', orgId] })
		})
	})

	it('sends correct request body', async () => {
		// Arrange
		let capturedBody: unknown

		server.use(
			http.put(`/api/organizations/${orgId}`, async ({ request }) => {
				capturedBody = await request.json()
				return HttpResponse.json({
					organization: {
						id: orgId,
						name: 'Updated Org',
						slug: 'updated-org',
						description: 'New description',
						logoUrl: null,
						createdAt: new Date('2024-01-01').toISOString(),
						updatedAt: new Date('2024-01-02').toISOString(),
					},
				})
			}),
		)

		// Act
		const { result } = renderHook(() => useUpdateOrganization(orgId), { wrapper })

		await result.current.mutateAsync({
			name: 'Updated Org',
			description: 'New description',
		})

		// Assert
		expect(capturedBody).toEqual({
			name: 'Updated Org',
			description: 'New description',
		})
	})
})
