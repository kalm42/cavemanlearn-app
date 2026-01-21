import { beforeEach, describe, expect, it, vi } from 'vitest'
import { captureEvent, captureException, getFeatureFlag, isFeatureEnabled } from '../utils'

const { mockCapture, mockIsFeatureEnabled, mockGetFeatureFlag } = vi.hoisted(() => ({
	mockCapture: vi.fn(),
	mockIsFeatureEnabled: vi.fn(),
	mockGetFeatureFlag: vi.fn(),
}))

vi.mock('posthog-js', () => ({
	default: {
		capture: mockCapture,
		isFeatureEnabled: mockIsFeatureEnabled,
		getFeatureFlag: mockGetFeatureFlag,
	},
}))

describe('PostHog utils', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('captureEvent', () => {
		it('calls posthog.capture with event name and properties', () => {
			// Arrange
			const eventName = 'button_clicked'
			const properties = { buttonName: 'submit', page: 'checkout' }

			// Act
			captureEvent(eventName, properties)

			// Assert
			expect(mockCapture).toHaveBeenCalledWith(eventName, properties)
		})

		it('calls posthog.capture without properties when not provided', () => {
			// Arrange
			const eventName = 'page_viewed'

			// Act
			captureEvent(eventName)

			// Assert
			expect(mockCapture).toHaveBeenCalledWith(eventName, undefined)
		})
	})

	describe('captureException', () => {
		it('captures Error objects with message and stack trace', () => {
			// Arrange
			const error = new Error('Something went wrong')

			// Act
			captureException(error)

			// Assert
			expect(mockCapture).toHaveBeenCalledWith('$exception', {
				$exception_message: 'Something went wrong',
				$exception_stack_trace_raw: error.stack,
				$exception_type: 'Error',
			})
		})

		it('captures non-Error values as strings', () => {
			// Arrange
			const error = 'String error message'

			// Act
			captureException(error)

			// Assert
			expect(mockCapture).toHaveBeenCalledWith('$exception', {
				$exception_message: 'String error message',
				$exception_stack_trace_raw: undefined,
				$exception_type: 'Error',
			})
		})

		it('includes additional context when provided', () => {
			// Arrange
			const error = new Error('API failed')
			const context = { endpoint: '/api/users', userId: '123' }

			// Act
			captureException(error, context)

			// Assert
			expect(mockCapture).toHaveBeenCalledWith('$exception', {
				$exception_message: 'API failed',
				$exception_stack_trace_raw: error.stack,
				$exception_type: 'Error',
				endpoint: '/api/users',
				userId: '123',
			})
		})

		it('captures custom error types correctly', () => {
			// Arrange
			class CustomError extends Error {
				constructor(message: string) {
					super(message)
					this.name = 'CustomError'
				}
			}
			const error = new CustomError('Custom error occurred')

			// Act
			captureException(error)

			// Assert
			expect(mockCapture).toHaveBeenCalledWith('$exception', {
				$exception_message: 'Custom error occurred',
				$exception_stack_trace_raw: error.stack,
				$exception_type: 'CustomError',
			})
		})
	})

	describe('isFeatureEnabled', () => {
		it('returns true when feature flag is enabled', () => {
			// Arrange
			mockIsFeatureEnabled.mockReturnValue(true)

			// Act
			const result = isFeatureEnabled('new_dashboard')

			// Assert
			expect(result).toBe(true)
			expect(mockIsFeatureEnabled).toHaveBeenCalledWith('new_dashboard')
		})

		it('returns false when feature flag is disabled', () => {
			// Arrange
			mockIsFeatureEnabled.mockReturnValue(false)

			// Act
			const result = isFeatureEnabled('new_dashboard')

			// Assert
			expect(result).toBe(false)
		})

		it('returns false when feature flag returns undefined', () => {
			// Arrange
			mockIsFeatureEnabled.mockReturnValue(undefined)

			// Act
			const result = isFeatureEnabled('unknown_flag')

			// Assert
			expect(result).toBe(false)
		})
	})

	describe('getFeatureFlag', () => {
		it('returns boolean value for boolean flags', () => {
			// Arrange
			mockGetFeatureFlag.mockReturnValue(true)

			// Act
			const result = getFeatureFlag('boolean_flag')

			// Assert
			expect(result).toBe(true)
			expect(mockGetFeatureFlag).toHaveBeenCalledWith('boolean_flag')
		})

		it('returns string value for multivariate flags', () => {
			// Arrange
			mockGetFeatureFlag.mockReturnValue('variant_a')

			// Act
			const result = getFeatureFlag('experiment_flag')

			// Assert
			expect(result).toBe('variant_a')
		})

		it('returns undefined for unknown flags', () => {
			// Arrange
			mockGetFeatureFlag.mockReturnValue(undefined)

			// Act
			const result = getFeatureFlag('unknown_flag')

			// Assert
			expect(result).toBeUndefined()
		})
	})
})
