import { Link } from '@tanstack/react-router'
import { BookOpen, Plus, Settings, Users } from 'lucide-react'
import type { OrganizationWithRole } from '@/db/validators'
import { hasMinimumRole } from '@/lib/permissions'
import { m } from '@/paraglide/messages'

/**
 * ## OrganizationDashboard
 *
 * Dashboard content for a single organization. Shows organization description,
 * quick stats (member count, deck count), and quick actions based on user's role.
 *
 * @example
 * <OrganizationDashboard organization={organization} />
 */
export function OrganizationDashboard(props: { organization: OrganizationWithRole }) {
	const { organization } = props

	const canManageMembers = hasMinimumRole(organization.role, 'admin')
	const canAccessSettings = hasMinimumRole(organization.role, 'admin')
	const canCreateDecks = hasMinimumRole(organization.role, 'writer')

	return (
		<div className="space-y-6">
			<div className="bg-slate-800 rounded-xl p-6">
				<h2 className="text-xl font-semibold text-white mb-4">
					{m.organization_dashboard_title()}
				</h2>
				<p className="text-gray-400">
					{organization.description || m.organization_dashboard_no_description()}
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="bg-slate-800 rounded-xl p-6">
					<div className="flex items-center gap-3 mb-2">
						<Users className="w-5 h-5 text-cyan-400" />
						<h3 className="text-sm font-medium text-gray-400">
							{m.organization_dashboard_stats_members()}
						</h3>
					</div>
					<p className="text-3xl font-bold text-white">{organization.memberCount}</p>
				</div>

				<div className="bg-slate-800 rounded-xl p-6">
					<div className="flex items-center gap-3 mb-2">
						<BookOpen className="w-5 h-5 text-cyan-400" />
						<h3 className="text-sm font-medium text-gray-400">
							{m.organization_dashboard_stats_decks()}
						</h3>
					</div>
					<p className="text-3xl font-bold text-white">0</p>
				</div>
			</div>

			<div className="bg-slate-800 rounded-xl p-6">
				<h3 className="text-lg font-semibold text-white mb-4">
					{m.organization_dashboard_quick_actions()}
				</h3>
				<div className="flex flex-wrap gap-3">
					{canManageMembers && (
						<Link
							to="/publisher/organizations/$orgId/members"
							params={{ orgId: organization.id }}
							className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
						>
							<Users size={18} />
							<span>{m.organization_dashboard_action_manage_members()}</span>
						</Link>
					)}

					{canCreateDecks && (
						<span title={m.coming_soon()}>
							<button
								type="button"
								disabled
								aria-label={`${m.organization_dashboard_action_create_deck()} - ${m.coming_soon()}`}
								className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 text-gray-500 rounded-lg cursor-not-allowed"
							>
								<Plus size={18} />
								<span>{m.organization_dashboard_action_create_deck()}</span>
								<span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-600 text-gray-400 rounded">
									{m.coming_soon()}
								</span>
							</button>
						</span>
					)}

					{canAccessSettings && (
						<Link
							to="/publisher/organizations/$orgId/settings"
							params={{ orgId: organization.id }}
							className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
						>
							<Settings size={18} />
							<span>{m.organization_dashboard_action_view_settings()}</span>
						</Link>
					)}
				</div>
			</div>
		</div>
	)
}
