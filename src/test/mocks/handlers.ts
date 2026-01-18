/**
 * MSW handlers for mocking external services and APIs.
 *
 * Note: Clerk's backend SDK (`verifyToken`) is mocked via Vitest's `vi.mock()` in unit/integration tests.
 * These handlers are primarily for E2E tests and future webhook endpoint testing.
 *
 * When adding handlers, import from 'msw' and add handlers like:
 * import { http, HttpResponse } from 'msw'
 * http.post('https://api.clerk.dev/v1/webhooks/*', () => {
 *   return HttpResponse.json({ success: true })
 * })
 */
export const handlers = [
	// Add request handlers here as needed
	// Clerk webhook endpoint mock (for future webhook testing)
	// import { http, HttpResponse } from 'msw'
	// http.post('https://api.clerk.dev/v1/webhooks/*', () => {
	// 	return HttpResponse.json({ success: true })
	// }),
]
