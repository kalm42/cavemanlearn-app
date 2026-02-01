import { cva } from 'class-variance-authority'
import { Crown, Trash2 } from 'lucide-react'
import { RoleSelector, getRoleLabel } from './RoleSelector'
import type { MemberWithProfile, NonOwnerRole } from '@/lib/validation/organization-members'
import { m } from '@/paraglide/messages'

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

interface MemberRowProps {
	member: MemberWithProfile
	canManageMembers: boolean
	onRoleChange: (memberId: string, newRole: NonOwnerRole) => void
	onRemoveClick: (member: MemberWithProfile) => void
	isBeingUpdated: boolean
	isBeingRemoved: boolean
}

/**
 * ## MemberRow
 *
 * Renders a single row in the members table. Displays member avatar, name, email,
 * role (as selector or badge), join date, and action buttons based on permissions.
 *
 * @example
 * <MemberRow
 *   member={member}
 *   canManageMembers={true}
 *   onRoleChange={handleRoleChange}
 *   onRemoveClick={handleRemoveClick}
 *   isBeingUpdated={false}
 *   isBeingRemoved={false}
 * />
 */
export function MemberRow(props: MemberRowProps) {
	const { member, canManageMembers, onRoleChange, onRemoveClick, isBeingUpdated, isBeingRemoved } =
		props

	const isOwner = member.role === 'owner'
	const displayName = member.profile.displayName || member.profile.email

	function formatDate(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date
		return d.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		})
	}

	return (
		<tr className="border-b border-slate-700/50 last:border-b-0">
			<td className="py-4 px-6">
				<div className="flex items-center gap-3">
					{member.profile.avatarUrl ? (
						<img
							src={member.profile.avatarUrl}
							alt=""
							className="w-10 h-10 rounded-full object-cover"
						/>
					) : (
						<div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
							<span className="text-gray-400 text-sm font-medium">
								{displayName.charAt(0).toUpperCase()}
							</span>
						</div>
					)}
					<div>
						<p className="text-white font-medium flex items-center gap-2">
							{displayName}
							{isOwner && <Crown className="w-4 h-4 text-amber-400" aria-hidden="true" />}
						</p>
						<p className="text-gray-400 text-sm">{member.profile.email}</p>
					</div>
				</div>
			</td>
			<td className="py-4 px-6">
				{canManageMembers && !isOwner ? (
					<div className="w-32">
						<RoleSelector
							value={member.role as NonOwnerRole}
							onChange={(newRole) => {
								onRoleChange(member.id, newRole)
							}}
							disabled={isBeingUpdated || isBeingRemoved}
							aria-label={`Change role for ${displayName}`}
						/>
					</div>
				) : (
					<span className={roleBadgeVariants({ role: member.role })}>
						{getRoleLabel(member.role)}
					</span>
				)}
			</td>
			<td className="py-4 px-6">
				<span className="text-gray-400 text-sm">{formatDate(member.createdAt)}</span>
			</td>
			{canManageMembers && (
				<td className="py-4 px-6 text-right">
					{isOwner ? (
						<span className="text-gray-500 text-sm" title={m.organization_members_owner_badge()}>
							—
						</span>
					) : (
						<button
							type="button"
							onClick={() => {
								onRemoveClick(member)
							}}
							disabled={isBeingUpdated || isBeingRemoved}
							className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							aria-label={`${m.organization_members_remove_button()} ${displayName}`}
						>
							<Trash2 className="w-4 h-4" />
						</button>
					)}
				</td>
			)}
		</tr>
	)
}
