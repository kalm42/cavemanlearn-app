import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { captureServerEvent, captureServerException } from '../server'

interface PostHogCaptureBody {
	api_key: string
	event: string
	distinct_id: string
	properties: Record<string, unknown>
}

function parseRequestBody(mockFetch: ReturnType<typeof vi.fn>): PostHogCaptureBody {
	const call = mockFetch.mock.calls[0] as [string, { body: string }]
	return JSON.parse(call[1].body) as PostHogCaptureBody
}

const mockFetch = vi.fn()

vi.mock('@/env.ts', () => ({
	env: {
		VITE_PUBLIC_POSTHOG_KEY: 'test-api-key',
		VITE_PUBLIC_POSTHOG_HOST: 'https://app.posthog.com',
	},
}))

describe('PostHog Server Utils', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', mockFetch)
		mockFetch.mockResolvedValue({ ok: true })
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.unstubAllGlobals()
	})

	describe('captureServerException', () => {
		it('sends exception to PostHog API with Error object', () => {
			// Arrange
			const error = new Error('Test error message')

			// Act
			captureServerException(error, { userId: 'user-123' })

			// Assert
			expect(mockFetch).toHaveBeenCalledTimes(1)
			expect(mockFetch).toHaveBeenCalledWith(
				'https://app.posthog.com/capture/',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				}),
			)

			const body = parseRequestBody(mockFetch)
			expect(body.api_key).toBe('test-api-key')
			expect(body.event).toBe('$exception')
			expect(body.properties.$exception_message).toBe('Test error message')
			expect(body.properties.$exception_type).toBe('Error')
			expect(body.properties.$exception_stack_trace_raw).toBeDefined()
			expect(body.properties.userId).toBe('user-123')
			expect(body.distinct_id).toBe('user-123')
		})

		it('handles non-Error objects', () => {
			// Arrange
			const error = 'String error'

			// Act
			captureServerException(error)

			// Assert
			expect(mockFetch).toHaveBeenCalledTimes(1)

			const body = parseRequestBody(mockFetch)
			expect(body.properties.$exception_message).toBe('String error')
			expect(body.properties.$exception_type).toBe('Error')
			expect(body.properties.$exception_stack_trace_raw).toBeUndefined()
		})

		it('uses clerkId as distinct_id when userId not provided', () => {
			// Arrange
			const error = new Error('Test')

			// Act
			captureServerException(error, { clerkId: 'clerk-456' })

			// Assert
			const body = parseRequestBody(mockFetch)
			expect(body.distinct_id).toBe('clerk-456')
		})

		it('uses "server" as distinct_id when no user context provided', () => {
			// Arrange
			const error = new Error('Test')

			// Act
			captureServerException(error)

			// Assert
			const body = parseRequestBody(mockFetch)
			expect(body.distinct_id).toBe('server')
		})

		it('includes context properties in the event', () => {
			// Arrange
			const error = new Error('Test')
			const context = {
				context: 'handleAddMember',
				orgId: 'org-123',
				customField: 'custom-value',
			}

			// Act
			captureServerException(error, context)

			// Assert
			const body = parseRequestBody(mockFetch)
			expect(body.properties.context).toBe('handleAddMember')
			expect(body.properties.orgId).toBe('org-123')
			expect(body.properties.customField).toBe('custom-value')
		})

		it('does not throw when fetch fails', () => {
			// Arrange
			mockFetch.mockRejectedValue(new Error('Network error'))
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			// Act & Assert
			expect(() => {
				captureServerException(new Error('Test'))
			}).not.toThrow()

			consoleSpy.mockRestore()
		})
	})

	describe('captureServerEvent', () => {
		it('sends event to PostHog API', () => {
			// Arrange
			const eventName = 'member_added'
			const properties = { orgId: 'org-123', role: 'editor' }

			// Act
			captureServerEvent(eventName, properties, 'user-123')

			// Assert
			expect(mockFetch).toHaveBeenCalledTimes(1)
			expect(mockFetch).toHaveBeenCalledWith(
				'https://app.posthog.com/capture/',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
				}),
			)

			const body = parseRequestBody(mockFetch)
			expect(body.api_key).toBe('test-api-key')
			expect(body.event).toBe('member_added')
			expect(body.properties.orgId).toBe('org-123')
			expect(body.properties.role).toBe('editor')
			expect(body.distinct_id).toBe('user-123')
		})

		it('uses userId from properties as distinct_id when not provided', () => {
			// Arrange
			const eventName = 'test_event'
			const properties = { userId: 'user-from-props' }

			// Act
			captureServerEvent(eventName, properties)

			// Assert
			const body = parseRequestBody(mockFetch)
			expect(body.distinct_id).toBe('user-from-props')
		})

		it('uses "server" as distinct_id when no user context provided', () => {
			// Arrange
			const eventName = 'test_event'

			// Act
			captureServerEvent(eventName)

			// Assert
			const body = parseRequestBody(mockFetch)
			expect(body.distinct_id).toBe('server')
		})

		it('does not throw when fetch fails', () => {
			// Arrange
			mockFetch.mockRejectedValue(new Error('Network error'))
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

			// Act & Assert
			expect(() => {
				captureServerEvent('test_event')
			}).not.toThrow()

			consoleSpy.mockRestore()
		})
	})
})
