import posthog from 'posthog-js'

type EventProperties = Record<string, unknown>

/**
 * ## captureEvent
 *
 * Captures a custom analytics event in PostHog. Use this for tracking
 * user actions, conversions, and other important events in your application.
 *
 * @example
 * captureEvent('button_clicked', { buttonName: 'submit', page: 'checkout' })
 *
 * @example
 * captureEvent('purchase_completed', { amount: 99.99, currency: 'USD' })
 */
export function captureEvent(eventName: string, properties?: EventProperties) {
	if (typeof window === 'undefined') {
		return
	}

	posthog.capture(eventName, properties)
}

/**
 * ## captureException
 *
 * Captures an error or exception in PostHog for error tracking and monitoring.
 * Includes the error message, stack trace, and any additional context you provide.
 *
 * @example
 * try {
 *   await riskyOperation()
 * } catch (error) {
 *   captureException(error, { operation: 'riskyOperation', userId: '123' })
 * }
 *
 * @example
 * captureException(new Error('Payment failed'), { orderId: 'abc123' })
 */
export function captureException(error: unknown, context?: EventProperties) {
	if (typeof window === 'undefined') {
		return
	}

	const errorMessage = error instanceof Error ? error.message : String(error)
	const errorStack = error instanceof Error ? error.stack : undefined

	posthog.capture('$exception', {
		$exception_message: errorMessage,
		$exception_stack_trace_raw: errorStack,
		$exception_type: error instanceof Error ? error.name : 'Error',
		...context,
	})
}

/**
 * ## isFeatureEnabled
 *
 * Checks if a feature flag is enabled for the current user. Returns a boolean
 * indicating whether the feature should be shown. Use this for feature rollouts
 * and A/B testing.
 *
 * @example
 * if (isFeatureEnabled('new_dashboard')) {
 *   return <NewDashboard />
 * }
 * return <OldDashboard />
 *
 * @example
 * const showBetaFeature = isFeatureEnabled('beta_feature')
 */
export function isFeatureEnabled(flagKey: string): boolean {
	if (typeof window === 'undefined') {
		return false
	}

	return posthog.isFeatureEnabled(flagKey) ?? false
}

/**
 * ## getFeatureFlag
 *
 * Retrieves the value of a feature flag, which can be a boolean or a string
 * for multivariate flags. Use this when you need the specific variant value
 * rather than just a boolean check.
 *
 * @example
 * const variant = getFeatureFlag('checkout_flow')
 * if (variant === 'streamlined') {
 *   return <StreamlinedCheckout />
 * }
 *
 * @example
 * const buttonColor = getFeatureFlag('cta_button_color') || 'blue'
 */
export function getFeatureFlag(flagKey: string): string | boolean | undefined {
	if (typeof window === 'undefined') {
		return undefined
	}

	return posthog.getFeatureFlag(flagKey)
}
