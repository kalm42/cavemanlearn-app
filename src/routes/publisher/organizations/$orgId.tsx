import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/publisher/organizations/$orgId')({
	component: OrganizationDashboardPage,
})

/**
 * ## OrganizationDashboardPage
 *
 * Placeholder page for viewing an organization's dashboard. This page will be
 * fully implemented in Phase 1.15 with organization details, stats, and
 * navigation tabs.
 *
 * @example
 * // Route is automatically registered via createFileRoute
 * // Publishers navigate to /publisher/organizations/:orgId to view an org
 */
function OrganizationDashboardPage() {
	const { orgId } = Route.useParams()

	return (
		<div className="bg-slate-800 rounded-xl p-8">
			<h1 className="text-2xl font-bold text-white mb-4">Organization Dashboard</h1>
			<p className="text-gray-400">Organization ID: {orgId}</p>
			<p className="text-gray-400 mt-2">Coming soon in Phase 1.15</p>
		</div>
	)
}
