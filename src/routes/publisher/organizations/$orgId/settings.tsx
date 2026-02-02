import { createFileRoute } from '@tanstack/react-router'
import { Suspense } from 'react'
import type { OrganizationWithRole } from '@/db/validators'
import { LoadingScreen } from '@/components/LoadingScreen'
import { OrganizationSettingsAccessDenied } from '@/components/organization/OrganizationSettingsAccessDenied'
import { OrganizationSettingsPage } from '@/components/organization/OrganizationSettingsPage'
import { useOrganizationSettings } from '@/hooks/useOrganizationSettings'
import { useSuspenseOrganization } from '@/hooks/useSuspenseOrganization'
import { hasMinimumRole } from '@/lib/permissions'

export const Route = createFileRoute('/publisher/organizations/$orgId/settings')({
	component: OrganizationSettingsRoute,
})

type OrganizationSettingsLoaderProps = {
	orgId: string
}

type OrganizationSettingsWithDefaultsProps = {
	orgId: string
	organization: OrganizationWithRole
}

function OrganizationSettingsRoute() {
	const { orgId } = Route.useParams()

	return (
		<Suspense fallback={<LoadingScreen />}>
			<OrganizationSettingsLoader orgId={orgId} />
		</Suspense>
	)
}

function OrganizationSettingsLoader(props: OrganizationSettingsLoaderProps) {
	const { orgId } = props
	const { organization } = useSuspenseOrganization(orgId)

	if (!organization) {
		return null
	}

	const canAccessSettings = hasMinimumRole(organization.role, 'admin')

	if (!canAccessSettings) {
		return <OrganizationSettingsAccessDenied orgId={orgId} />
	}

	return <OrganizationSettingsWithDefaults orgId={orgId} organization={organization} />
}

function OrganizationSettingsWithDefaults(props: OrganizationSettingsWithDefaultsProps) {
	const { orgId, organization } = props
	const { settings } = useOrganizationSettings(orgId)

	return <OrganizationSettingsPage organization={organization} settings={settings} />
}
