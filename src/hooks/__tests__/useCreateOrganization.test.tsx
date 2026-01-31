import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as ClerkReact from '@clerk/clerk-react'
import { HttpResponse, http } from 'msw'
import { useCreateOrganization } from '../useCreateOrganization'
import { server } from '@/test/mocks/server'

vi.mock('@clerk/clerk-react')

describe('useCreateOrganization', () => {
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

	it('creates organization successfully', async () => {
		// Arrange
		const mockOrganization = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'Test Org',
			slug: 'test-org',
			description: 'A test organization',
			logoUrl: null,
			createdAt: new Date('2024-01-01').toISOString(),
			updatedAt: new Date('2024-01-01').toISOString(),
		}
		const mockMembership = {
			id: '660e8400-e29b-41d4-a716-446655440001',
			organizationId: '550e8400-e29b-41d4-a716-446655440000',
			userId: '770e8400-e29b-41d4-a716-446655440002',
			role: 'owner' as const,
			createdAt: new Date('2024-01-01').toISOString(),
		}

		server.use(
			http.post('/api/organizations', () => {
				return HttpResponse.json(
					{
						organization: mockOrganization,
						membership: mockMembership,
					},
					{ status: 201 },
				)
			}),
		)

		const onSuccess = vi.fn()

		// Act
		const { result } = renderHook(() => useCreateOrganization({ onSuccess }), { wrapper })

		await result.current.mutateAsync({
			name: 'Test Org',
			description: 'A test organization',
		})

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})
		expect(onSuccess).toHaveBeenCalledTimes(1)
		// Zod coerces dates to Date objects, so check properties individually
		const callArg = onSuccess.mock.calls[0]?.[0] as {
			organization: { id: string; name: string; slug: string }
			membership: { id: string; role: string }
		}
		expect(callArg.organization.id).toBe(mockOrganization.id)
		expect(callArg.organization.name).toBe(mockOrganization.name)
		expect(callArg.organization.slug).toBe(mockOrganization.slug)
		expect(callArg.membership.id).toBe(mockMembership.id)
		expect(callArg.membership.role).toBe(mockMembership.role)
	})

	it('throws ApiError with NOT_AUTHENTICATED code when not authenticated', async () => {
		// Arrange
		mockGetToken.mockResolvedValue(null)
		const { result } = renderHook(() => useCreateOrganization(), { wrapper })

		// Act & Assert
		await expect(
			result.current.mutateAsync({
				name: 'Test Org',
				description: null,
			}),
		).rejects.toMatchObject({
			code: 'NOT_AUTHENTICATED',
		})
	})

	it('throws ApiError with DUPLICATE_SLUG code for duplicate organization', async () => {
		// Arrange
		server.use(
			http.post('/api/organizations', () => {
				return HttpResponse.json({ error: { code: 'DUPLICATE_SLUG' } }, { status: 409 })
			}),
		)
		const { result } = renderHook(() => useCreateOrganization(), { wrapper })

		// Act & Assert
		await expect(
			result.current.mutateAsync({
				name: 'Test Org',
				description: null,
			}),
		).rejects.toMatchObject({
			code: 'DUPLICATE_SLUG',
		})
	})

	it('throws ApiError with UNKNOWN_ERROR code for non-JSON response', async () => {
		// Arrange
		server.use(
			http.post('/api/organizations', () => {
				return new HttpResponse('Internal Server Error', { status: 500 })
			}),
		)
		const { result } = renderHook(() => useCreateOrganization(), { wrapper })

		// Act & Assert
		await expect(
			result.current.mutateAsync({
				name: 'Test Org',
				description: null,
			}),
		).rejects.toMatchObject({
			code: 'UNKNOWN_ERROR',
		})
	})

	it('invalidates organizations query on success', async () => {
		// Arrange
		const mockOrganization = {
			id: '550e8400-e29b-41d4-a716-446655440000',
			name: 'Test Org',
			slug: 'test-org',
			description: null,
			logoUrl: null,
			createdAt: new Date('2024-01-01').toISOString(),
			updatedAt: new Date('2024-01-01').toISOString(),
		}
		const mockMembership = {
			id: '660e8400-e29b-41d4-a716-446655440001',
			organizationId: '550e8400-e29b-41d4-a716-446655440000',
			userId: '770e8400-e29b-41d4-a716-446655440002',
			role: 'owner' as const,
			createdAt: new Date('2024-01-01').toISOString(),
		}

		server.use(
			http.post('/api/organizations', () => {
				return HttpResponse.json(
					{
						organization: mockOrganization,
						membership: mockMembership,
					},
					{ status: 201 },
				)
			}),
		)

		const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

		// Act
		const { result } = renderHook(() => useCreateOrganization(), { wrapper })

		await result.current.mutateAsync({
			name: 'Test Org',
			description: null,
		})

		// Assert
		await waitFor(() => {
			expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['organizations'] })
		})
	})

	it('sends correct request body', async () => {
		// Arrange
		let capturedBody: unknown

		server.use(
			http.post('/api/organizations', async ({ request }) => {
				capturedBody = await request.json()
				return HttpResponse.json(
					{
						organization: {
							id: '550e8400-e29b-41d4-a716-446655440000',
							name: 'Test Org',
							slug: 'test-org',
							description: 'My description',
							logoUrl: null,
							createdAt: new Date('2024-01-01').toISOString(),
							updatedAt: new Date('2024-01-01').toISOString(),
						},
						membership: {
							id: '660e8400-e29b-41d4-a716-446655440001',
							organizationId: '550e8400-e29b-41d4-a716-446655440000',
							userId: '770e8400-e29b-41d4-a716-446655440002',
							role: 'owner',
							createdAt: new Date('2024-01-01').toISOString(),
						},
					},
					{ status: 201 },
				)
			}),
		)

		// Act
		const { result } = renderHook(() => useCreateOrganization(), { wrapper })

		await result.current.mutateAsync({
			name: 'Test Org',
			description: 'My description',
		})

		// Assert
		expect(capturedBody).toEqual({
			name: 'Test Org',
			description: 'My description',
		})
	})
})
