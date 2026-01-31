import { Outlet, createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { LoadingScreen } from '@/components/LoadingScreen'
import { OrganizationLayout, OrganizationNotFound } from '@/components/organization/OrganizationLayout'
import { useSuspenseOrganization } from '@/hooks/useSuspenseOrganization'

export const Route = createFileRoute('/publisher/organizations/$orgId')({
	component: OrganizationLayoutRoute,
})

function OrganizationLayoutRoute() {
	const { orgId } = Route.useParams()

	return (
		<Suspense fallback={<LoadingScreen />}>
			<OrganizationLayoutLoader orgId={orgId} />
		</Suspense>
	)
}

function OrganizationLayoutLoader(props: { orgId: string }) {
	const { orgId } = props
	const { organization } = useSuspenseOrganization(orgId)

	if (!organization) {
		return <OrganizationNotFound />
	}

	return (
		<OrganizationLayout organization={organization}>
			<Outlet />
		</OrganizationLayout>
	)
}
