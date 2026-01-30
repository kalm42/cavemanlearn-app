import { Link } from '@tanstack/react-router'
import { cva } from 'class-variance-authority'
import { Building2, Users } from 'lucide-react'
import type { OrganizationWithRole } from '@/hooks/useOrganizations'
import { m } from '@/paraglide/messages'

interface OrganizationCardProps {
	organization: OrganizationWithRole
}

const roleBadgeVariants = cva('px-2 py-1 rounded text-xs font-medium', {
	variants: {
		role: {
			owner: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
			admin: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
			editor: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
			writer: 'bg-green-500/20 text-green-400 border border-green-500/30',
			viewer: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
		},
	},
})

/**
 * ## getRoleLabel
 *
 * Returns the localized display label for an organization role.
 * Maps each role to its corresponding i18n message.
 *
 * @example
 * const label = getRoleLabel('owner')
 * // Returns "Owner" (localized)
 */
function getRoleLabel(role: OrganizationWithRole['role']): string {
	const roleLabels = {
		owner: m.organization_role_owner(),
		admin: m.organization_role_admin(),
		editor: m.organization_role_editor(),
		writer: m.organization_role_writer(),
		viewer: m.organization_role_viewer(),
	}
	return roleLabels[role]
}

/**
 * ## OrganizationCard
 *
 * Card component displaying an organization's information including name,
 * description, member count, and the current user's role. Links to the
 * organization's dashboard when clicked.
 *
 * @example
 * <OrganizationCard organization={org} />
 */
export function OrganizationCard(props: OrganizationCardProps) {
	const { organization } = props

	return (
		<Link
			to="/publisher/organizations/$orgId"
			params={{ orgId: organization.id }}
			className="block bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-slate-600 hover:bg-slate-800/80 transition-all group"
		>
			<div className="flex items-start gap-4">
				<div className="flex-shrink-0">
					{organization.logoUrl ? (
						<img
							src={organization.logoUrl}
							alt={organization.name}
							className="w-12 h-12 rounded-lg object-cover"
						/>
					) : (
						<div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
							<Building2 className="w-6 h-6 text-gray-400" />
						</div>
					)}
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2 mb-1">
						<h3 className="text-lg font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">
							{organization.name}
						</h3>
						<span className={roleBadgeVariants({ role: organization.role })}>
							{getRoleLabel(organization.role)}
						</span>
					</div>

					{organization.description && (
						<p className="text-gray-400 text-sm line-clamp-2 mb-3">{organization.description}</p>
					)}

					<div className="flex items-center gap-1 text-gray-500 text-sm">
						<Users size={14} />
						<span>{m.organization_card_members({ count: organization.memberCount })}</span>
					</div>
				</div>
			</div>
		</Link>
	)
}
