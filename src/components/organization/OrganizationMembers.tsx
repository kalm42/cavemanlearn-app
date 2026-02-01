import { UserPlus } from 'lucide-react'
import { useReducer } from 'react'
import { MemberList } from './MemberList'
import { AddMemberModal } from './AddMemberModal'
import type { OrganizationWithRole } from '@/db/validators'
import type { ApiError } from '@/lib/errors'
import type { NonOwnerRole } from '@/lib/validation/organization-members'
import { canManageMembers } from '@/lib/permissions'
import { useMembers } from '@/hooks/useMembers'
import { useAddMember } from '@/hooks/useAddMember'
import { useUpdateMemberRole } from '@/hooks/useUpdateMemberRole'
import { useRemoveMember } from '@/hooks/useRemoveMember'
import { m } from '@/paraglide/messages'

interface OrganizationMembersProps {
	organization: OrganizationWithRole
}

interface MembersState {
	showAddModal: boolean
	addErrorMessage: string | null
	successMessage: string | null
	errorMessage: string | null
	updatingMemberId: string | null
	removingMemberId: string | null
}

type MembersAction =
	| { type: 'OPEN_ADD_MODAL' }
	| { type: 'CLOSE_ADD_MODAL' }
	| { type: 'SET_ADD_ERROR'; message: string }
	| { type: 'SHOW_SUCCESS'; message: string }
	| { type: 'SHOW_ERROR'; message: string }
	| { type: 'CLEAR_SUCCESS' }
	| { type: 'CLEAR_ERROR' }
	| { type: 'START_UPDATING'; memberId: string }
	| { type: 'FINISH_UPDATING' }
	| { type: 'START_REMOVING'; memberId: string }
	| { type: 'FINISH_REMOVING' }

const initialState: MembersState = {
	showAddModal: false,
	addErrorMessage: null,
	successMessage: null,
	errorMessage: null,
	updatingMemberId: null,
	removingMemberId: null,
}

/**
 * ## membersReducer
 *
 * Manages state transitions for the organization members UI. Consolidates
 * modal visibility, error/success messages, and operation tracking.
 *
 * @example
 * dispatch({ type: 'SHOW_SUCCESS', message: 'Member added' })
 */
function membersReducer(state: MembersState, action: MembersAction): MembersState {
	switch (action.type) {
		case 'OPEN_ADD_MODAL':
			return { ...state, showAddModal: true, addErrorMessage: null }
		case 'CLOSE_ADD_MODAL':
			return { ...state, showAddModal: false, addErrorMessage: null }
		case 'SET_ADD_ERROR':
			return { ...state, addErrorMessage: action.message }
		case 'SHOW_SUCCESS':
			return { ...state, successMessage: action.message, errorMessage: null }
		case 'SHOW_ERROR':
			return { ...state, errorMessage: action.message, successMessage: null }
		case 'CLEAR_SUCCESS':
			return { ...state, successMessage: null }
		case 'CLEAR_ERROR':
			return { ...state, errorMessage: null }
		case 'START_UPDATING':
			return { ...state, updatingMemberId: action.memberId }
		case 'FINISH_UPDATING':
			return { ...state, updatingMemberId: null }
		case 'START_REMOVING':
			return { ...state, removingMemberId: action.memberId }
		case 'FINISH_REMOVING':
			return { ...state, removingMemberId: null }
		default:
			return state
	}
}

/**
 * ## getAddMemberErrorMessage
 *
 * Maps API error codes to localized error messages for the add member flow.
 */
function getAddMemberErrorMessage(error: ApiError): string {
	switch (error.code) {
		case 'USER_NOT_FOUND':
			return m.organization_members_add_error_not_found()
		case 'ALREADY_MEMBER':
			return m.organization_members_add_error_already_member()
		default:
			return m.organization_members_add_error()
	}
}

/**
 * ## OrganizationMembers
 *
 * Main component for managing organization members. Displays the member list,
 * handles adding/removing members, and role updates. Permission-aware - only
 * shows management controls to admins and owners.
 *
 * @example
 * <OrganizationMembers organization={organization} />
 */
export function OrganizationMembers(props: OrganizationMembersProps) {
	const { organization } = props

	const [state, dispatch] = useReducer(membersReducer, initialState)

	const { members, isLoading, error: membersError } = useMembers(organization.id)

	const addMember = useAddMember(organization.id, {
		onSuccess: () => {
			dispatch({ type: 'CLOSE_ADD_MODAL' })
			showSuccess(m.organization_members_add_success())
		},
		onError: (error) => {
			dispatch({ type: 'SET_ADD_ERROR', message: getAddMemberErrorMessage(error) })
		},
	})

	const updateRole = useUpdateMemberRole(organization.id, {
		onSuccess: () => {
			dispatch({ type: 'FINISH_UPDATING' })
			showSuccess(m.organization_members_role_update_success())
		},
		onError: () => {
			dispatch({ type: 'FINISH_UPDATING' })
			showError(m.organization_members_role_update_error())
		},
	})

	const removeMember = useRemoveMember(organization.id, {
		onSuccess: () => {
			dispatch({ type: 'FINISH_REMOVING' })
			showSuccess(m.organization_members_remove_success())
		},
		onError: () => {
			dispatch({ type: 'FINISH_REMOVING' })
			showError(m.organization_members_remove_error())
		},
	})

	const userCanManageMembers = canManageMembers(organization.role)

	function showSuccess(message: string) {
		dispatch({ type: 'SHOW_SUCCESS', message })
		setTimeout(() => {
			dispatch({ type: 'CLEAR_SUCCESS' })
		}, 3000)
	}

	function showError(message: string) {
		dispatch({ type: 'SHOW_ERROR', message })
		setTimeout(() => {
			dispatch({ type: 'CLEAR_ERROR' })
		}, 5000)
	}

	function handleAddClick() {
		dispatch({ type: 'OPEN_ADD_MODAL' })
	}

	function handleAddCancel() {
		dispatch({ type: 'CLOSE_ADD_MODAL' })
	}

	function handleAddSubmit(email: string, role: NonOwnerRole) {
		addMember.mutate({ email, role })
	}

	function handleRoleChange(memberId: string, newRole: NonOwnerRole) {
		dispatch({ type: 'START_UPDATING', memberId })
		updateRole.mutate({ memberId, role: newRole })
	}

	function handleRemove(memberId: string) {
		dispatch({ type: 'START_REMOVING', memberId })
		removeMember.mutate(memberId)
	}

	if (!userCanManageMembers) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-white">{m.organization_members_title()}</h1>
						<p className="text-gray-400 mt-1">{m.organization_members_description()}</p>
					</div>
				</div>

				<div className="bg-slate-800 rounded-xl p-8 text-center">
					<p className="text-gray-400">{m.organization_members_access_denied()}</p>
				</div>
			</div>
		)
	}

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-white">{m.organization_members_title()}</h1>
						<p className="text-gray-400 mt-1">{m.organization_members_description()}</p>
					</div>
				</div>

				<div className="bg-slate-800 rounded-xl p-8 text-center">
					<p className="text-gray-400">{m.organization_members_loading()}</p>
				</div>
			</div>
		)
	}

	if (membersError) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-white">{m.organization_members_title()}</h1>
						<p className="text-gray-400 mt-1">{m.organization_members_description()}</p>
					</div>
				</div>

				<div className="bg-red-900/20 border border-red-500/30 rounded-xl p-8 text-center">
					<p className="text-red-400">{m.organization_members_error()}</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-white">{m.organization_members_title()}</h1>
					<p className="text-gray-400 mt-1">{m.organization_members_description()}</p>
				</div>

				<button
					type="button"
					onClick={handleAddClick}
					className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
				>
					<UserPlus className="w-4 h-4" />
					{m.organization_members_add_button()}
				</button>
			</div>

			{state.successMessage && (
				<div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
					<p className="text-green-400">{state.successMessage}</p>
				</div>
			)}

			{state.errorMessage && (
				<div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
					<p className="text-red-400">{state.errorMessage}</p>
				</div>
			)}

			<MemberList
				members={members}
				currentUserRole={organization.role}
				onRoleChange={handleRoleChange}
				onRemove={handleRemove}
				isUpdating={updateRole.isPending}
				isRemoving={removeMember.isPending}
				updatingMemberId={state.updatingMemberId}
				removingMemberId={state.removingMemberId}
			/>

			<AddMemberModal
				isOpen={state.showAddModal}
				isPending={addMember.isPending}
				errorMessage={state.addErrorMessage}
				onCancel={handleAddCancel}
				onSubmit={handleAddSubmit}
			/>
		</div>
	)
}
