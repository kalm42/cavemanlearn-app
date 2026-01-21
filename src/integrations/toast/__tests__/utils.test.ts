import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	showErrorToast,
	showInfoToast,
	showSuccessToast,
	showWarningToast,
} from '../utils'

const { mockSuccess, mockError, mockInfo, mockWarning } = vi.hoisted(() => ({
	mockSuccess: vi.fn(),
	mockError: vi.fn(),
	mockInfo: vi.fn(),
	mockWarning: vi.fn(),
}))

vi.mock('sonner', () => ({
	toast: {
		success: mockSuccess,
		error: mockError,
		info: mockInfo,
		warning: mockWarning,
	},
}))

describe('Toast utils', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('showSuccessToast', () => {
		it('calls toast.success with message and green styling', () => {
			// Arrange
			const message = 'Settings saved successfully'

			// Act
			showSuccessToast(message)

			// Assert
			expect(mockSuccess).toHaveBeenCalledWith(message, {
				className: 'bg-green-900/30 border-green-500/50 text-green-400',
			})
		})
	})

	describe('showErrorToast', () => {
		it('calls toast.error with message and red styling', () => {
			// Arrange
			const message = 'Failed to save settings'

			// Act
			showErrorToast(message)

			// Assert
			expect(mockError).toHaveBeenCalledWith(message, {
				className: 'bg-red-900/30 border-red-500/50 text-red-400',
			})
		})
	})

	describe('showInfoToast', () => {
		it('calls toast.info with message and cyan styling', () => {
			// Arrange
			const message = 'New features available'

			// Act
			showInfoToast(message)

			// Assert
			expect(mockInfo).toHaveBeenCalledWith(message, {
				className: 'bg-cyan-600/30 border-cyan-500/50 text-cyan-400',
			})
		})
	})

	describe('showWarningToast', () => {
		it('calls toast.warning with message and amber styling', () => {
			// Arrange
			const message = 'Your session will expire soon'

			// Act
			showWarningToast(message)

			// Assert
			expect(mockWarning).toHaveBeenCalledWith(message, {
				className: 'bg-amber-900/30 border-amber-500/50 text-amber-400',
			})
		})
	})
})
