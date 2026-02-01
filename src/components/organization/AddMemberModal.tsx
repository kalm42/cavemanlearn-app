import { cva } from 'class-variance-authority'
import { useEffect, useRef, useState } from 'react'
import { RoleSelector } from './RoleSelector'
import type { NonOwnerRole } from '@/lib/validation/organization-members'
import { m } from '@/paraglide/messages'

const inputVariants = cva(
	'w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-400 transition-colors',
	{
		variants: {
			disabled: {
				true: 'opacity-50 cursor-not-allowed',
				false: 'focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none',
			},
			hasError: {
				true: 'border-red-500 focus:border-red-500 focus:ring-red-500',
				false: '',
			},
		},
		defaultVariants: {
			disabled: false,
			hasError: false,
		},
	},
)

interface AddMemberModalProps {
	isOpen: boolean
	isPending: boolean
	errorMessage: string | null
	onCancel: () => void
	onSubmit: (email: string, role: NonOwnerRole) => void
}

/**
 * ## AddMemberModal
 *
 * Modal dialog for adding a new member to an organization. Uses the native dialog element
 * for built-in accessibility including keyboard navigation (Escape to close) and focus trapping.
 * Includes email input validation and role selection.
 *
 * @example
 * <AddMemberModal
 *   isOpen={showAddModal}
 *   isPending={addMember.isPending}
 *   errorMessage={addError}
 *   onCancel={() => setShowAddModal(false)}
 *   onSubmit={(email, role) => handleAddMember(email, role)}
 * />
 */
export function AddMemberModal(props: AddMemberModalProps) {
	const { isOpen, isPending, errorMessage, onCancel, onSubmit } = props

	const dialogRef = useRef<HTMLDialogElement>(null)
	const emailInputRef = useRef<HTMLInputElement>(null)

	const [email, setEmail] = useState('')
	const [emailError, setEmailError] = useState<string | null>(null)
	const [role, setRole] = useState<NonOwnerRole>('viewer')

	useEffect(() => {
		const dialog = dialogRef.current
		if (!dialog) {
			return
		}

		if (isOpen) {
			dialog.showModal()
			emailInputRef.current?.focus()
		} else {
			dialog.close()
			setEmail('')
			setEmailError(null)
			setRole('viewer')
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

	function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
		setEmail(e.target.value)
		if (emailError) {
			setEmailError(null)
		}
	}

	function validateEmail(value: string): boolean {
		if (!value.trim()) {
			setEmailError(m.organization_members_add_email_required())
			return false
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(value)) {
			setEmailError(m.organization_members_add_email_invalid())
			return false
		}
		return true
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()

		if (!validateEmail(email)) {
			return
		}

		onSubmit(email.trim(), role)
	}

	const canSubmit = email.trim().length > 0 && !isPending

	return (
		<dialog
			ref={dialogRef}
			aria-labelledby="add-member-modal-title"
			aria-describedby="add-member-modal-description"
			className="bg-slate-800 rounded-xl p-8 max-w-md w-full mx-4 backdrop:bg-black/50"
		>
			<h3 id="add-member-modal-title" className="text-xl font-semibold text-white mb-2">
				{m.organization_members_add_title()}
			</h3>
			<p id="add-member-modal-description" className="text-gray-400 mb-6">
				{m.organization_members_add_description()}
			</p>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div>
					<label htmlFor="member-email" className="block text-sm font-medium text-gray-300 mb-2">
						{m.organization_members_add_email_label()}
					</label>
					<input
						ref={emailInputRef}
						type="email"
						id="member-email"
						value={email}
						onChange={handleEmailChange}
						placeholder={m.organization_members_add_email_placeholder()}
						disabled={isPending}
						className={inputVariants({ disabled: isPending, hasError: !!emailError })}
						aria-invalid={emailError ? 'true' : undefined}
						aria-describedby={emailError ? 'email-error' : undefined}
						autoComplete="email"
					/>
					{emailError && (
						<p id="email-error" className="mt-2 text-sm text-red-400" role="alert">
							{emailError}
						</p>
					)}
				</div>

				<div>
					<label htmlFor="member-role" className="block text-sm font-medium text-gray-300 mb-2">
						{m.organization_members_add_role_label()}
					</label>
					<RoleSelector id="member-role" value={role} onChange={setRole} disabled={isPending} />
				</div>

				{errorMessage && (
					<div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
						<p className="text-red-400 text-sm">{errorMessage}</p>
					</div>
				)}

				<div className="flex gap-4 pt-2">
					<button
						type="button"
						onClick={onCancel}
						disabled={isPending}
						className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors"
					>
						{m.organization_members_add_cancel()}
					</button>
					<button
						type="submit"
						disabled={!canSubmit}
						className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-800 disabled:opacity-50 text-white rounded-lg transition-colors"
					>
						{isPending
							? m.organization_members_add_submitting()
							: m.organization_members_add_submit()}
					</button>
				</div>
			</form>
		</dialog>
	)
}
