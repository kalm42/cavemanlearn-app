import { createFileRoute } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/publisher/organizations/$orgId/members')({
	component: OrganizationMembersPage,
})

/**
 * ## OrganizationMembersPage
 *
 * Placeholder page for managing organization members. Will be fully implemented
 * in Phase 1.16 with member list, add/remove members, and role management.
 *
 * @example
 * // Route is automatically registered via createFileRoute
 * // Publishers navigate to /publisher/organizations/:orgId/members
 */
function OrganizationMembersPage() {
	return (
		<div className="bg-slate-800 rounded-xl p-8 text-center">
			<Users className="w-16 h-16 text-gray-500 mx-auto mb-4" />
			<h2 className="text-xl font-semibold text-white mb-2">{m.organization_nav_members()}</h2>
			<p className="text-gray-400">Coming soon in Phase 1.16</p>
		</div>
	)
}
