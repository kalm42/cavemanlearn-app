import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as ClerkReact from '@clerk/clerk-react'
import { HttpResponse, http } from 'msw'
import { useUpdateOrganizationSettings } from '../useUpdateOrganizationSettings'
import { server } from '@/test/mocks/server'

vi.mock('@clerk/clerk-react')

describe('useUpdateOrganizationSettings', () => {
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

	it('updates organization settings successfully', async () => {
		// Arrange
		const mockSettings = {
			id: '660e8400-e29b-41d4-a716-446655440001',
			organizationId: orgId,
			defaultMonthlyPrice: 999,
			defaultYearlyPrice: null,
			brandColorPrimary: '#FF5733',
			brandColorSecondary: null,
			brandLogoUrl: null,
			createdAt: new Date('2024-01-01').toISOString(),
			updatedAt: new Date('2024-01-02').toISOString(),
		}

		server.use(
			http.put(`/api/organizations/${orgId}/settings`, () => {
				return HttpResponse.json({ settings: mockSettings })
			}),
		)

		const onSuccess = vi.fn()

		// Act
		const { result } = renderHook(() => useUpdateOrganizationSettings(orgId, { onSuccess }), {
			wrapper,
		})

		await result.current.mutateAsync({
			defaultMonthlyPrice: 999,
			brandColorPrimary: '#FF5733',
		})

		// Assert
		await waitFor(() => {
			expect(result.current.isSuccess).toBe(true)
		})
		expect(onSuccess).toHaveBeenCalledTimes(1)
		const callArg = onSuccess.mock.calls[0]?.[0] as {
			settings: { defaultMonthlyPrice: number }
		}
		expect(callArg.settings.defaultMonthlyPrice).toBe(999)
	})

	it('throws ApiError with NOT_AUTHENTICATED code when not authenticated', async () => {
		// Arrange
		mockGetToken.mockResolvedValue(null)
		const { result } = renderHook(() => useUpdateOrganizationSettings(orgId), { wrapper })

		// Act & Assert
		await expect(result.current.mutateAsync({ defaultMonthlyPrice: 999 })).rejects.toMatchObject({
			code: 'NOT_AUTHENTICATED',
		})
	})

	it('throws ApiError with FORBIDDEN code for unauthorized users', async () => {
		// Arrange
		server.use(
			http.put(`/api/organizations/${orgId}/settings`, () => {
				return HttpResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 })
			}),
		)
		const { result } = renderHook(() => useUpdateOrganizationSettings(orgId), { wrapper })

		// Act & Assert
		await expect(result.current.mutateAsync({ defaultMonthlyPrice: 999 })).rejects.toMatchObject({
			code: 'FORBIDDEN',
		})
	})

	it('throws ApiError with VALIDATION_ERROR code for invalid data', async () => {
		// Arrange
		server.use(
			http.put(`/api/organizations/${orgId}/settings`, () => {
				return HttpResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 })
			}),
		)
		const { result } = renderHook(() => useUpdateOrganizationSettings(orgId), { wrapper })

		// Act & Assert
		await expect(result.current.mutateAsync({ defaultMonthlyPrice: 999 })).rejects.toMatchObject({
			code: 'VALIDATION_ERROR',
		})
	})

	it('invalidates organizationSettings query on success', async () => {
		// Arrange
		const mockSettings = {
			id: '660e8400-e29b-41d4-a716-446655440001',
			organizationId: orgId,
			defaultMonthlyPrice: 999,
			defaultYearlyPrice: null,
			brandColorPrimary: null,
			brandColorSecondary: null,
			brandLogoUrl: null,
			createdAt: new Date('2024-01-01').toISOString(),
			updatedAt: new Date('2024-01-02').toISOString(),
		}

		server.use(
			http.put(`/api/organizations/${orgId}/settings`, () => {
				return HttpResponse.json({ settings: mockSettings })
			}),
		)

		const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')

		// Act
		const { result } = renderHook(() => useUpdateOrganizationSettings(orgId), { wrapper })

		await result.current.mutateAsync({ defaultMonthlyPrice: 999 })

		// Assert
		await waitFor(() => {
			expect(invalidateQueriesSpy).toHaveBeenCalledWith({
				queryKey: ['organizationSettings', orgId],
			})
		})
	})

	it('sends correct request body', async () => {
		// Arrange
		let capturedBody: unknown

		server.use(
			http.put(`/api/organizations/${orgId}/settings`, async ({ request }) => {
				capturedBody = await request.json()
				return HttpResponse.json({
					settings: {
						id: '660e8400-e29b-41d4-a716-446655440001',
						organizationId: orgId,
						defaultMonthlyPrice: 999,
						defaultYearlyPrice: 9999,
						brandColorPrimary: '#FF5733',
						brandColorSecondary: '#3498DB',
						brandLogoUrl: 'https://example.com/logo.png',
						createdAt: new Date('2024-01-01').toISOString(),
						updatedAt: new Date('2024-01-02').toISOString(),
					},
				})
			}),
		)

		// Act
		const { result } = renderHook(() => useUpdateOrganizationSettings(orgId), { wrapper })

		await result.current.mutateAsync({
			defaultMonthlyPrice: 999,
			defaultYearlyPrice: 9999,
			brandColorPrimary: '#FF5733',
			brandColorSecondary: '#3498DB',
			brandLogoUrl: 'https://example.com/logo.png',
		})

		// Assert
		expect(capturedBody).toEqual({
			defaultMonthlyPrice: 999,
			defaultYearlyPrice: 9999,
			brandColorPrimary: '#FF5733',
			brandColorSecondary: '#3498DB',
			brandLogoUrl: 'https://example.com/logo.png',
		})
	})
})
