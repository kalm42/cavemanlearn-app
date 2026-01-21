import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'
import posthog from 'posthog-js'

import { env } from '@/env'

const POSTHOG_KEY = env.VITE_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = env.VITE_PUBLIC_POSTHOG_HOST

/**
 * ## initPostHog
 *
 * Initializes the PostHog client with the configured API key and host.
 * Only initializes on the client side and only once.
 *
 * @example
 * initPostHog()
 */
function initPostHog() {
	if (posthog.__loaded) {
		return
	}

	posthog.init(POSTHOG_KEY, {
		api_host: POSTHOG_HOST,
		person_profiles: 'identified_only',
		capture_pageview: false,
		capture_pageleave: true,
		autocapture: true,
	})
}

interface PostHogProviderProps {
	children: React.ReactNode
}

/**
 * ## PostHogProvider
 *
 * Wraps the application with PostHog analytics provider. This should be placed
 * at the root of the application to enable analytics throughout.
 *
 * @example
 * <PostHogProvider>
 *   <App />
 * </PostHogProvider>
 */
export default function PostHogProvider(props: PostHogProviderProps) {
	const { children } = props

	useEffect(() => {
		initPostHog()
	}, [])

	if (typeof window === 'undefined') {
		return <>{children}</>
	}

	return <PHProvider client={posthog}>{children}</PHProvider>
}
