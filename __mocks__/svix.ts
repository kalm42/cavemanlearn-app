import { vi } from 'vitest'

/**
 * ## Automatic mock for svix
 *
 * Vitest will use this when you call vi.mock('svix') without a factory.
 * Import mockVerify to configure the verify method's behavior in tests.
 *
 * @example
 * import { mockVerify } from '../../__mocks__/svix'
 * import { handleClerkWebhook } from './api.webhooks.clerk'
 *
 * vi.mock('svix')
 *
 * // Configure the mock to return a specific payload
 * mockVerify.mockReturnValue({ type: 'user.created', data: {...} })
 *
 * // Or make it throw to test error handling
 * mockVerify.mockImplementation(() => { throw new Error('Invalid signature') })
 */
export const mockVerify = vi.fn()

export class Webhook {
	secret: string

	constructor(secret: string) {
		this.secret = secret
	}

	verify = mockVerify
}
