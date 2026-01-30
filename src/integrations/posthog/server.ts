import { env } from '@/env.ts'

type EventProperties = Record<string, unknown>

/**
 * ## captureServerException
 *
 * Captures an error or exception from server-side code to PostHog for error
 * tracking and monitoring. Uses the PostHog HTTP API to send events directly
 * from the server without requiring a browser context.
 *
 * This function is fire-and-forget - it won't throw if the request fails,
 * but will log errors to the console for debugging.
 *
 * @example
 * try {
 *   await riskyDatabaseOperation()
 * } catch (error) {
 *   captureServerException(error, {
 *     context: 'handleAddMember',
 *     orgId: 'abc123',
 *   })
 *   return Response.json({ error: 'Operation failed' }, { status: 500 })
 * }
 */
export function captureServerException(error: unknown, context?: EventProperties): void {
	const apiKey = env.VITE_PUBLIC_POSTHOG_KEY
	const host = env.VITE_PUBLIC_POSTHOG_HOST

	if (!apiKey || !host) {
		console.error('[PostHog] Missing API key or host, cannot capture exception')
		return
	}

	const errorMessage = error instanceof Error ? error.message : String(error)
	const errorStack = error instanceof Error ? error.stack : undefined
	const errorType = error instanceof Error ? error.name : 'Error'

	const payload = {
		api_key: apiKey,
		event: '$exception',
		properties: {
			$exception_message: errorMessage,
			$exception_stack_trace_raw: errorStack,
			$exception_type: errorType,
			$lib: 'posthog-server',
			$lib_version: '1.0.0',
			...context,
		},
		timestamp: new Date().toISOString(),
		distinct_id: context?.userId ?? context?.clerkId ?? 'server',
	}

	// Fire and forget - don't await, don't block the response
	fetch(`${host}/capture/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	}).catch((fetchError: unknown) => {
		console.error('[PostHog] Failed to capture exception:', fetchError)
	})
}

/**
 * ## captureServerEvent
 *
 * Captures a custom analytics event from server-side code to PostHog.
 * Uses the PostHog HTTP API to send events directly from the server.
 *
 * This function is fire-and-forget - it won't throw if the request fails,
 * but will log errors to the console for debugging.
 *
 * @example
 * captureServerEvent('member_added', {
 *   orgId: 'abc123',
 *   role: 'editor',
 *   addedBy: 'user456',
 * })
 */
export function captureServerEvent(
	eventName: string,
	properties?: EventProperties,
	distinctId?: string,
): void {
	const apiKey = env.VITE_PUBLIC_POSTHOG_KEY
	const host = env.VITE_PUBLIC_POSTHOG_HOST

	if (!apiKey || !host) {
		console.error('[PostHog] Missing API key or host, cannot capture event')
		return
	}

	const payload = {
		api_key: apiKey,
		event: eventName,
		properties: {
			$lib: 'posthog-server',
			$lib_version: '1.0.0',
			...properties,
		},
		timestamp: new Date().toISOString(),
		distinct_id: distinctId ?? properties?.userId ?? 'server',
	}

	// Fire and forget - don't await, don't block the response
	fetch(`${host}/capture/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(payload),
	}).catch((fetchError: unknown) => {
		console.error('[PostHog] Failed to capture event:', fetchError)
	})
}
