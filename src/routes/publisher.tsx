import { Outlet, createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/clerk-react'
import { LoadingScreen } from '@/components/LoadingScreen'
import { PublisherAccessDenied, PublisherLayout } from '@/components/publisher/PublisherLayout'
import { useRedirectIfUnauthenticated } from '@/hooks/useRedirectIfUnauthenticated'
import { useUserProfile } from '@/hooks/useUserProfile'

export const Route = createFileRoute('/publisher')({
	component: PublisherLayoutRoute,
})

function PublisherLayoutRoute() {
	const { isLoaded: userLoaded, isSignedIn } = useUser()
	const { profile, isLoading: profileLoading } = useUserProfile()

	useRedirectIfUnauthenticated()

	if (!userLoaded || profileLoading) {
		return <LoadingScreen />
	}

	if (!isSignedIn) {
		return null
	}

	if (profile?.userType !== 'publisher') {
		return <PublisherAccessDenied />
	}

	return (
		<PublisherLayout>
			<Outlet />
		</PublisherLayout>
	)
}
