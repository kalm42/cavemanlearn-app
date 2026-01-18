import { vi } from 'vitest'

/**
 * Automatic mock for @clerk/backend.
 * Vitest will use this when you call vi.mock('@clerk/backend') without a factory.
 *
 * @example
 * import { vi } from 'vitest'
 * import { verifyToken } from '@clerk/backend'
 *
 * vi.mock('@clerk/backend') // Automatically uses this mock
 *
 * const mockVerifyToken = vi.mocked(verifyToken)
 */
export const verifyToken = vi.fn()
