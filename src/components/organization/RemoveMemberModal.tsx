import { useEffect, useRef } from 'react'
import { m } from '@/paraglide/messages'

interface RemoveMemberModalProps {
	isOpen: boolean
	memberName: string
	isPending: boolean
	onCancel: () => void
	onConfirm: () => void
}

/**
 * ## RemoveMemberModal
 *
 * Confirmation modal for removing a member from an organization. Uses the native dialog element
 * for built-in accessibility including keyboard navigation (Escape to close) and focus trapping.
 *
 * @example
 * <RemoveMemberModal
 *   isOpen={showRemoveModal}
 *   memberName="John Doe"
 *   isPending={removeMember.isPending}
 *   onCancel={() => setShowRemoveModal(false)}
 *   onConfirm={() => handleRemove(memberId)}
 * />
 */
export function RemoveMemberModal(props: RemoveMemberModalProps) {
	const { isOpen, memberName, isPending, onCancel, onConfirm } = props

	const dialogRef = useRef<HTMLDialogElement>(null)

	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) {
			return
		}

		if (isOpen) {
			dialog.showModal()
		} else {
			dialog.close()
		}
	}, [isOpen])

	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) {
			return
		}

		function handleClose() {
			onCancel()
		}

		dialog.addEventListener('close', handleClose)
		return () => {
			dialog.removeEventListener('close', handleClose)
		}
	}, [onCancel])

	return (
		<dialog
			ref={dialogRef}
			aria-labelledby="remove-member-modal-title"
			aria-describedby="remove-member-modal-description"
			className="bg-slate-800 rounded-xl p-8 max-w-md mx-4 backdrop:bg-black/50"
		>
			<h3 id="remove-member-modal-title" className="text-xl font-semibold text-white mb-4">
				{m.organization_members_remove_title()}
			</h3>
			<p id="remove-member-modal-description" className="text-gray-400 mb-6">
				{m.organization_members_remove_confirm_message({ name: memberName })}
			</p>
			<div className="flex gap-4">
				<button
					type="button"
					onClick={onCancel}
					disabled={isPending}
					className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors"
				>
					{m.organization_members_remove_cancel()}
				</button>
				<button
					type="button"
					onClick={onConfirm}
					disabled={isPending}
					className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded-lg transition-colors"
				>
					{isPending ? m.loading() : m.organization_members_remove_confirm_button()}
				</button>
			</div>
		</dialog>
	)
}
