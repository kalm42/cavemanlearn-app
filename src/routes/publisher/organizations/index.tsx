import { Link, createFileRoute } from '@tanstack/react-router'
import { Building2, Plus } from 'lucide-react'
import { LoadingScreen } from '@/components/LoadingScreen'
import { OrganizationCard } from '@/components/organization/OrganizationCard'
import { useOrganizations } from '@/hooks/useOrganizations'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/publisher/organizations/')({
	component: OrganizationsListPage,
})

/**
 * ## OrganizationsListPage
 *
 * Page component displaying the list of organizations the current user belongs to.
 * Shows organization cards with role badges and provides a button to create new
 * organizations. Handles loading, error, and empty states appropriately.
 *
 * @example
 * // Route is automatically registered via createFileRoute
 * // Publishers navigate to /publisher/organizations to access this page
 */
function OrganizationsListPage() {
	const { organizations, isLoading, error } = useOrganizations()

	if (isLoading) {
		return <LoadingScreen />
	}

	if (error) {
		return (
			<div className="bg-slate-800 rounded-xl p-8">
				<div className="text-center">
					<div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
						<p className="text-red-400">{m.publisher_organizations_error()}</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-white">{m.publisher_organizations_title()}</h1>
					<p className="text-gray-400 mt-1">{m.publisher_organizations_description()}</p>
				</div>
				<Link
					to="/publisher/organizations/new"
					className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
				>
					<Plus size={20} />
					<span>{m.publisher_organizations_create_button()}</span>
				</Link>
			</div>

			{organizations.length === 0 ? (
				<div className="bg-slate-800 rounded-xl p-12">
					<div className="text-center">
						<Building2 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
						<h2 className="text-xl font-semibold text-white mb-2">
							{m.publisher_organizations_empty_title()}
						</h2>
						<p className="text-gray-400 mb-6">{m.publisher_organizations_empty_description()}</p>
						<Link
							to="/publisher/organizations/new"
							className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
						>
							<Plus size={20} />
							<span>{m.publisher_organizations_create_button()}</span>
						</Link>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{organizations.map((org) => (
						<OrganizationCard key={org.id} organization={org} />
					))}
				</div>
			)}
		</div>
	)
}
