import { useRouterState } from '@tanstack/react-router'
import { usePostHog } from 'posthog-js/react'
import { useEffect, useRef } from 'react'

/**
 * ## PostHogPageviewTracker
 *
 * Tracks page views in PostHog when the route changes. Uses TanStack Router's
 * router state to detect navigation and captures pageview events with the
 * current URL and referrer information.
 *
 * @example
 * // Place inside PostHogProvider in your root layout
 * <PostHogProvider>
 *   <PostHogPageviewTracker />
 *   {children}
 * </PostHogProvider>
 */
export default function PostHogPageviewTracker() {
	const posthog = usePostHog()
	const routerState = useRouterState()
	const pathname = routerState.location.pathname
	const search = routerState.location.searchStr
	const previousPathRef = useRef<string | null>(null)

	useEffect(() => {
		const currentPath = pathname + search
		if (previousPathRef.current === currentPath) {
			return
		}

		previousPathRef.current = currentPath

		posthog.capture('$pageview', {
			$current_url: window.location.href,
			$referrer: document.referrer,
		})
	}, [pathname, search, posthog])

	return null
}
