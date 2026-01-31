import { Link } from '@tanstack/react-router'
import { cva } from 'class-variance-authority'
import { ArrowLeft, LayoutDashboard, Settings, Users } from 'lucide-react'
import type { OrganizationWithRole } from '@/db/validators'
import { hasMinimumRole } from '@/lib/permissions'
import { m } from '@/paraglide/messages'

const navLinkVariants = cva('flex items-center gap-3 p-3 rounded-lg transition-colors', {
	variants: {
		active: {
			true: 'bg-cyan-600 text-white hover:bg-cyan-700',
			false: 'text-gray-300 hover:bg-slate-700 hover:text-white',
		},
	},
	defaultVariants: {
		active: false,
	},
})

/**
 * ## OrganizationNotFound
 *
 * Displayed when organization is not found or user doesn't have access.
 *
 * @example
 * <OrganizationNotFound />
 */
export function OrganizationNotFound() {
	return (
		<div className="bg-slate-800 rounded-xl p-8 text-center">
			<h1 className="text-xl font-semibold text-white mb-2">{m.organization_not_found()}</h1>
			<p className="text-gray-400 mb-6">{m.organization_access_denied()}</p>
			<Link
				to="/publisher/organizations"
				className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
			>
				<ArrowLeft size={20} />
				<span>{m.organization_back_to_list()}</span>
			</Link>
		</div>
	)
}

/**
 * ## OrganizationLayout
 *
 * Layout component for a single organization. Provides a header with organization
 * name and sidebar navigation with tabs for Dashboard, Members, and Settings.
 * Settings tab is only visible to users with admin+ role.
 *
 * @example
 * <OrganizationLayout organization={organization}>
 *   <OrganizationDashboard organization={organization} />
 * </OrganizationLayout>
 */
export function OrganizationLayout(props: {
	organization: OrganizationWithRole
	children: React.ReactNode
}) {
	const { organization, children } = props

	const canAccessSettings = hasMinimumRole(organization.role, 'admin')

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Link
					to="/publisher/organizations"
					className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
				>
					<ArrowLeft size={20} />
					<span>{m.organization_back_to_list()}</span>
				</Link>
			</div>

			<div className="bg-slate-800 rounded-xl p-6">
				<div className="flex items-center gap-4 mb-6">
					{organization.logoUrl ? (
						<img
							src={organization.logoUrl}
							alt={organization.name}
							className="w-16 h-16 rounded-lg object-cover"
						/>
					) : (
						<div className="w-16 h-16 rounded-lg bg-slate-700 flex items-center justify-center">
							<span className="text-2xl font-bold text-gray-400">
								{organization.name.charAt(0).toUpperCase()}
							</span>
						</div>
					)}
					<div>
						<h1 className="text-2xl font-bold text-white">{organization.name}</h1>
						<p className="text-gray-400">{organization.slug}</p>
					</div>
				</div>

				<nav className="border-t border-slate-700 pt-4">
					<ul className="flex flex-wrap gap-2">
						<li>
							<Link
								to="/publisher/organizations/$orgId"
								params={{ orgId: organization.id }}
								className={navLinkVariants()}
								activeProps={{
									className: navLinkVariants({ active: true }),
								}}
								activeOptions={{ exact: true }}
							>
								<LayoutDashboard size={20} />
								<span>{m.organization_nav_dashboard()}</span>
							</Link>
						</li>
						<li>
							<Link
								to="/publisher/organizations/$orgId/members"
								params={{ orgId: organization.id }}
								className={navLinkVariants()}
								activeProps={{
									className: navLinkVariants({ active: true }),
								}}
							>
								<Users size={20} />
								<span>{m.organization_nav_members()}</span>
							</Link>
						</li>
						{canAccessSettings && (
							<li>
								<Link
									to="/publisher/organizations/$orgId/settings"
									params={{ orgId: organization.id }}
									className={navLinkVariants()}
									activeProps={{
										className: navLinkVariants({ active: true }),
									}}
								>
									<Settings size={20} />
									<span>{m.organization_nav_settings()}</span>
								</Link>
							</li>
						)}
					</ul>
				</nav>
			</div>

			{children}
		</div>
	)
}
