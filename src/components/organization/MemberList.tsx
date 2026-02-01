import { useState } from 'react'
import { MemberRow } from './MemberRow'
import { RemoveMemberModal } from './RemoveMemberModal'
import type { OrgRole } from '@/db/schema'
import type { MemberWithProfile, NonOwnerRole } from '@/lib/validation/organization-members'
import { m } from '@/paraglide/messages'

interface MemberListProps {
	members: Array<MemberWithProfile>
	currentUserRole: OrgRole
	onRoleChange: (memberId: string, newRole: NonOwnerRole) => void
	onRemove: (memberId: string) => void
	isUpdating: boolean
	isRemoving: boolean
	updatingMemberId: string | null
	removingMemberId: string | null
}

/**
 * ## MemberList
 *
 * Displays a list of organization members with their profiles, roles, and action buttons.
 * Admins+ can change member roles and remove members. The owner cannot be modified or removed.
 *
 * @example
 * <MemberList
 *   members={members}
 *   currentUserRole={organization.role}
 *   onRoleChange={handleRoleChange}
 *   onRemove={handleRemove}
 *   isUpdating={updateRole.isPending}
 *   isRemoving={removeMember.isPending}
 *   updatingMemberId={updatingMemberId}
 *   removingMemberId={removingMemberId}
 * />
 */
export function MemberList(props: MemberListProps) {
	const {
		members,
		currentUserRole,
		onRoleChange,
		onRemove,
		isUpdating,
		isRemoving,
		updatingMemberId,
		removingMemberId,
	} = props

	const [memberToRemove, setMemberToRemove] = useState<MemberWithProfile | null>(null)

	const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin'

	function handleRemoveClick(member: MemberWithProfile) {
		setMemberToRemove(member)
	}

	function handleRemoveCancel() {
		setMemberToRemove(null)
	}

	function handleRemoveConfirm() {
		if (memberToRemove) {
			onRemove(memberToRemove.id)
			setMemberToRemove(null)
		}
	}

	function getMemberDisplayName(member: MemberWithProfile): string {
		return member.profile.displayName || member.profile.email
	}

	if (members.length === 0) {
		return (
			<div className="bg-slate-800 rounded-xl p-8 text-center">
				<h3 className="text-lg font-medium text-white mb-2">
					{m.organization_members_empty_title()}
				</h3>
				<p className="text-gray-400">{m.organization_members_empty_description()}</p>
			</div>
		)
	}

	return (
		<>
			<div className="bg-slate-800 rounded-xl overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-slate-700">
								<th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
									{m.organization_members_table_member()}
								</th>
								<th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
									{m.organization_members_table_role()}
								</th>
								<th className="text-left py-4 px-6 text-sm font-medium text-gray-400">
									{m.organization_members_table_joined()}
								</th>
								{canManageMembers && (
									<th className="text-right py-4 px-6 text-sm font-medium text-gray-400">
										{m.organization_members_table_actions()}
									</th>
								)}
							</tr>
						</thead>
						<tbody>
							{members.map((member) => (
								<MemberRow
									key={member.id}
									member={member}
									canManageMembers={canManageMembers}
									onRoleChange={onRoleChange}
									onRemoveClick={handleRemoveClick}
									isBeingUpdated={updatingMemberId === member.id && isUpdating}
									isBeingRemoved={removingMemberId === member.id && isRemoving}
								/>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<RemoveMemberModal
				isOpen={memberToRemove !== null}
				memberName={memberToRemove ? getMemberDisplayName(memberToRemove) : ''}
				isPending={isRemoving}
				onCancel={handleRemoveCancel}
				onConfirm={handleRemoveConfirm}
			/>
		</>
	)
}
