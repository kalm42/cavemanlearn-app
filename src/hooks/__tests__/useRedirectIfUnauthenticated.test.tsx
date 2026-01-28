import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import * as ClerkReact from '@clerk/clerk-react'
import * as TanStackRouter from '@tanstack/react-router'
import { useRedirectIfUnauthenticated } from '../useRedirectIfUnauthenticated'

vi.mock('@clerk/clerk-react')
vi.mock('@tanstack/react-router')

describe('useRedirectIfUnauthenticated', () => {
	const mockNavigate = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(TanStackRouter.useNavigate).mockReturnValue(mockNavigate as never)
	})

	it('does not redirect when user is signed in', () => {
		// Arrange
		vi.mocked(ClerkReact.useUser).mockReturnValue({
			isSignedIn: true,
			isLoaded: true,
		} as never)

		// Act
		renderHook(() => {
			useRedirectIfUnauthenticated()
		})

		// Assert
		expect(mockNavigate).not.toHaveBeenCalled()
	})

	it('redirects when user is not authenticated', () => {
		// Arrange
		vi.mocked(ClerkReact.useUser).mockReturnValue({
			isSignedIn: false,
			isLoaded: true,
		} as never)

		// Act
		renderHook(() => {
			useRedirectIfUnauthenticated()
		})

		// Assert
		expect(mockNavigate).toHaveBeenCalledWith({ to: '/' })
	})
})
