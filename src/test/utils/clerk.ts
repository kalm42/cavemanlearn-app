import type { verifyToken } from '@clerk/backend'
import type { vi } from 'vitest'

/**
 * ## createMockAuthHeader
 *
 * Creates a mock Authorization header with a Bearer token for testing purposes.
 * The token value is arbitrary since verifyToken is automatically mocked from __mocks__/@clerk/backend.ts.
 *
 * Call this after importing verifyToken and calling vi.mock('@clerk/backend').
 *
 * @example
 * import { verifyToken } from '@clerk/backend'
 * import { createMockAuthHeader } from '@/test/utils/clerk'
 *
 * vi.mock('@clerk/backend') // Automatically uses __mocks__/@clerk/backend.ts
 * const mockVerifyToken = vi.mocked(verifyToken)
 *
 * const authHeader = createMockAuthHeader(mockVerifyToken, 'user_123', 'test@example.com')
 * const request = new Request('http://localhost/api/test', {
 *   headers: { Authorization: authHeader }
 * })
 */
export function createMockAuthHeader(
	mockVerifyToken: ReturnType<typeof vi.mocked<typeof verifyToken>>,
	userId: string,
	email: string,
): string {
	mockVerifyToken.mockResolvedValueOnce({
		sub: userId,
		email,
	} as never)
	return 'Bearer mock-token'
}
