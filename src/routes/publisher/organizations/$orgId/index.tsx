import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { LoadingScreen } from '@/components/LoadingScreen'
import { OrganizationDashboard } from '@/components/organization/OrganizationDashboard'
import { useSuspenseOrganization } from '@/hooks/useSuspenseOrganization'

export const Route = createFileRoute('/publisher/organizations/$orgId/')({
	component: OrganizationDashboardRoute,
})

function OrganizationDashboardRoute() {
	const { orgId } = Route.useParams()

	return (
		<Suspense fallback={<LoadingScreen />}>
			<OrganizationDashboardLoader orgId={orgId} />
		</Suspense>
	)
}

function OrganizationDashboardLoader(props: { orgId: string }) {
	const { orgId } = props
	const { organization } = useSuspenseOrganization(orgId)

	if (!organization) {
		return null
	}

	return <OrganizationDashboard organization={organization} />
}
