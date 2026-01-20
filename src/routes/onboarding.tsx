import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useUser } from '@clerk/clerk-react'
import { Suspense } from 'react'
import { OnboardingContent } from '../components/user/OnboardingContent'
import { LoadingScreen } from '../components/LoadingScreen'
import { useCreateUserProfile } from '@/hooks/useCreateUserProfile'
import { useRedirectIfUnauthenticated } from '@/hooks/useRedirectIfUnauthenticated'

export const Route = createFileRoute('/onboarding')({
	component: OnboardingScreen,
})

/**
 * ## OnboardingScreen
 *
 * Main component for the onboarding route. Handles authentication checks and renders
 * the onboarding form for users who haven't created a profile yet. Redirects authenticated
 * users without profiles to this page, and redirects users who already have profiles away.
 *
 * @example
 * // Route is automatically registered via createFileRoute
 * // Users navigate to /onboarding to access this component
 */
function OnboardingScreen() {
	const { isSignedIn, isLoaded: userLoaded } = useUser()
	const navigate = useNavigate()

	// Create profile mutation
	const createProfileMutation = useCreateUserProfile({
		onSuccess: (data) => {
			// Redirect based on user type
			if (data.userType === 'learner') {
				void navigate({ to: '/' }) // TODO: Redirect to learner dashboard when available
			} else {
				void navigate({ to: '/' }) // TODO: Redirect to publisher dashboard when available
			}
		},
	})

	// Redirect if not authenticated
	useRedirectIfUnauthenticated()

	// Show loading state for Clerk authentication
	if (!userLoaded) {
		return <LoadingScreen />
	}

	// Don't render if not signed in (will redirect)
	if (!isSignedIn) {
		return null
	}

	// Wrap profile-dependent content in Suspense
	return (
		<Suspense fallback={<LoadingScreen />}>
			<OnboardingContent navigate={navigate} createProfileMutation={createProfileMutation} />
		</Suspense>
	)
}
