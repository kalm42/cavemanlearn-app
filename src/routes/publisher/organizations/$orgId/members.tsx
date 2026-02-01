import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import { LoadingScreen } from '@/components/LoadingScreen'
import { OrganizationMembers } from '@/components/organization/OrganizationMembers'
import { useSuspenseOrganization } from '@/hooks/useSuspenseOrganization'

export const Route = createFileRoute('/publisher/organizations/$orgId/members')({
	component: OrganizationMembersRoute,
})

function OrganizationMembersRoute() {
	const { orgId } = Route.useParams()

	return (
		<Suspense fallback={<LoadingScreen />}>
			<OrganizationMembersLoader orgId={orgId} />
		</Suspense>
	)
}

function OrganizationMembersLoader(props: { orgId: string }) {
	const { orgId } = props
	const { organization } = useSuspenseOrganization(orgId)

	if (!organization) {
		return null
	}

	return <OrganizationMembers organization={organization} />
}
