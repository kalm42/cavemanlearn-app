import { Link } from '@tanstack/react-router'
import { ArrowLeft, ShieldX } from 'lucide-react'
import { m } from '@/paraglide/messages'

export type OrganizationSettingsAccessDeniedProps = {
	orgId: string
}

/**
 * ## OrganizationSettingsAccessDenied
 *
 * Displayed when a user without sufficient permissions tries to access
 * organization settings. Shows a 403 forbidden message with a link back
 * to the organization dashboard.
 *
 * @example
 * <OrganizationSettingsAccessDenied orgId="org-123" />
 */
export function OrganizationSettingsAccessDenied(props: OrganizationSettingsAccessDeniedProps) {
	const { orgId } = props

	return (
		<div className="flex items-center justify-center py-16">
			<div className="max-w-md mx-auto px-4 text-center">
				<div className="bg-slate-800 rounded-xl p-8">
					<ShieldX className="w-16 h-16 text-red-400 mx-auto mb-4" />
					<h1 className="text-xl font-semibold text-white mb-2">
						{m.organization_settings_access_denied_title()}
					</h1>
					<p className="text-gray-400 mb-6">{m.organization_settings_access_denied()}</p>
					<Link
						to="/publisher/organizations/$orgId"
						params={{ orgId }}
						className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
					>
						<ArrowLeft size={20} />
						<span>{m.organization_settings_back_to_dashboard()}</span>
					</Link>
				</div>
			</div>
		</div>
	)
}
