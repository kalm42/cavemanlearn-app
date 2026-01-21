import {
	HeadContent,
	Scripts,
	createRootRouteWithContext,
	useNavigate,
	useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useUser } from '@clerk/clerk-react'
import { useEffect } from 'react'

import Header from '../components/Header'

import ClerkProvider from '../integrations/clerk/provider'
import PostHogProvider from '../integrations/posthog/provider'
import PostHogPageviewTracker from '../integrations/posthog/pageview-tracker'
import PostHogUserIdentifier from '../integrations/posthog/user-identifier'
import { ToastProvider } from '../integrations/toast'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'
import { getLocale } from '@/paraglide/runtime'
import { useUserProfile } from '@/hooks/useUserProfile'

interface MyRouterContext {
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	beforeLoad: () => {
		// Other redirect strategies are possible; see
		// https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#offline-redirect
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('lang', getLocale())
		}
	},

	head: () => ({
		meta: [
			{charSet: 'utf-8',},
			{
				name: 'viewport',
				content: 'width=device-width, initial-scale=1',
			},
			{title: 'Caveman Learn',},
		],
		links: [
			{
				rel: 'stylesheet',
				href: appCss,
			},
		],
	}),

	shellComponent: RootDocument,
})

interface RootDocumentProps {
	children: React.ReactNode
}

function RootDocument(props: RootDocumentProps) {
	const { children } = props
	return (
		<html lang={getLocale()}>
			<head>
				<HeadContent />
			</head>
			<body>
				<PostHogProvider>
					<ClerkProvider>
						<ToastProvider>
							<PostHogUserIdentifier />
							<PostHogPageviewTracker />
							<OnboardingCheck>
								<Header />
								{children}
								<TanStackDevtools
									config={{
										position: 'bottom-right',
									}}
									plugins={[
										{
											name: 'Tanstack Router',
											render: <TanStackRouterDevtoolsPanel />,
										},
										TanStackQueryDevtools,
									]}
								/>
							</OnboardingCheck>
						</ToastProvider>
					</ClerkProvider>
				</PostHogProvider>
				<Scripts />
			</body>
		</html>
	)
}

/**
 * Component that checks if authenticated users have completed onboarding.
 * Redirects to /onboarding if they are authenticated but don't have a profile.
 */
function OnboardingCheck({ children }: { children: React.ReactNode }) {
	const { isSignedIn, isLoaded: userLoaded } = useUser()
	const navigate = useNavigate()
	const routerState = useRouterState()
	const currentPath = routerState.location.pathname

	// Skip onboarding check if already on onboarding page
	const isOnboardingPage = currentPath === '/onboarding'

	// Check if user has a profile
	// Treat errors as "no profile" for lenient redirect behavior
	const { profile, isLoading: profileLoading, error: profileError } = useUserProfile({
		enabled: userLoaded && isSignedIn && !isOnboardingPage,
	})

	// If there's an error, treat it as no profile (don't redirect on errors)
	const hasProfile = profile !== null && profileError === null

	// Redirect authenticated users without profiles to onboarding
	useEffect(() => {
		// Wait for user and profile to load
		if (!userLoaded || profileLoading) {
			return
		}

		// Skip if already on onboarding page
		if (isOnboardingPage) {
			return
		}

		// Redirect if signed in but no profile (and no error - errors are treated as "no redirect")
		if (isSignedIn && !hasProfile) {
			void navigate({ to: '/onboarding' })
		}
	}, [userLoaded, profileLoading, isSignedIn, hasProfile, isOnboardingPage, navigate])

	return <>{children}</>
}
