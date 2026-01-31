import { cva } from 'class-variance-authority'
import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { OrganizationWithRole } from '@/db/validators'
import SubmitButton from '@/components/user/SubmitButton'
import { canDeleteOrganization, hasMinimumRole } from '@/lib/permissions'
import { m } from '@/paraglide/messages'

const inputVariants = cva(
	'w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-400 transition-colors',
	{
		variants: {
			disabled: {
				true: 'opacity-50 cursor-not-allowed',
				false: 'focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none',
			},
		},
		defaultVariants: {
			disabled: false,
		},
	},
)

const textareaVariants = cva(
	'w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-gray-400 transition-colors resize-none',
	{
		variants: {
			disabled: {
				true: 'opacity-50 cursor-not-allowed',
				false: 'focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none',
			},
		},
		defaultVariants: {
			disabled: false,
		},
	},
)

/**
 * ## DeleteConfirmationModal
 *
 * Accessible modal for confirming organization deletion. Uses the native dialog element
 * which provides built-in keyboard navigation (Escape to close) and focus trapping.
 *
 * @example
 * <DeleteConfirmationModal
 *   isOpen={showDeleteConfirm}
 *   organizationName="My Org"
 *   isPending={false}
 *   onCancel={() => setShowDeleteConfirm(false)}
 *   onConfirm={() => handleDelete()}
 * />
 */
export function DeleteConfirmationModal(props: {
	isOpen: boolean
	organizationName: string
	isPending: boolean
	onCancel: () => void
	onConfirm: () => void
}) {
	const { isOpen, organizationName, isPending, onCancel, onConfirm } = props

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
			aria-labelledby="delete-modal-title"
			aria-describedby="delete-modal-description"
			className="bg-slate-800 rounded-xl p-8 max-w-md mx-4 backdrop:bg-black/50"
		>
			<h3 id="delete-modal-title" className="text-xl font-semibold text-white mb-4">
				{m.organization_settings_delete_confirm_title()}
			</h3>
			<p id="delete-modal-description" className="text-gray-400 mb-6">
				{m.organization_settings_delete_confirm_message({ name: organizationName })}
			</p>
			<div className="flex gap-4">
				<button
					type="button"
					onClick={onCancel}
					disabled={isPending}
					className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
				>
					{m.organization_settings_delete_cancel()}
				</button>
				<button
					type="button"
					onClick={onConfirm}
					disabled={isPending}
					className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors"
				>
					{isPending
						? m.organization_settings_deleting()
						: m.organization_settings_delete_confirm_button()}
				</button>
			</div>
		</dialog>
	)
}

export type OrganizationSettingsProps = {
	organization: OrganizationWithRole
	name: string
	description: string
	nameError: string | null
	descriptionError: string | null
	successMessage: string | null
	errorMessage: string | null
	deleteErrorMessage: string | null
	showDeleteConfirm: boolean
	isPendingUpdate: boolean
	isPendingDelete: boolean
	onNameChange: (name: string) => void
	onDescriptionChange: (description: string) => void
	onSubmit: () => void
	onDeleteClick: () => void
	onDeleteCancel: () => void
	onDeleteConfirm: () => void
}

/**
 * ## OrganizationSettings
 *
 * Settings form for a single organization. Allows admins+ to update organization
 * name and description, and owners to delete the organization. Shows access denied
 * if user doesn't have admin+ role.
 *
 * @example
 * <OrganizationSettings
 *   organization={organization}
 *   name={name}
 *   description={description}
 *   // ... other props
 * />
 */
export function OrganizationSettings(props: OrganizationSettingsProps) {
	const {
		organization,
		name,
		description,
		nameError,
		descriptionError,
		successMessage,
		errorMessage,
		deleteErrorMessage,
		showDeleteConfirm,
		isPendingUpdate,
		isPendingDelete,
		onNameChange,
		onDescriptionChange,
		onSubmit,
		onDeleteClick,
		onDeleteCancel,
		onDeleteConfirm,
	} = props

	const canAccessSettings = hasMinimumRole(organization.role, 'admin')
	const canDelete = canDeleteOrganization(organization.role)

	if (!canAccessSettings) {
		return (
			<div className="bg-slate-800 rounded-xl p-8 text-center">
				<h1 className="text-xl font-semibold text-white mb-2">
					{m.organization_settings_access_denied()}
				</h1>
			</div>
		)
	}

	const hasChanges = name !== organization.name || description !== (organization.description ?? '')

	function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
		onNameChange(e.target.value)
	}

	function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		onDescriptionChange(e.target.value)
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		onSubmit()
	}

	const canSubmit =
		hasChanges &&
		name.trim().length > 0 &&
		name.length <= 100 &&
		description.length <= 500 &&
		!isPendingUpdate

	return (
		<div className="space-y-6">
			<div className="bg-slate-800 rounded-xl p-8">
				<h2 className="text-xl font-semibold text-white mb-6">
					{m.organization_settings_general_title()}
				</h2>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
							{m.organization_settings_name_label()}
						</label>
						<input
							type="text"
							id="name"
							value={name}
							onChange={handleNameChange}
							placeholder={m.organization_settings_name_placeholder()}
							disabled={isPendingUpdate}
							className={inputVariants({ disabled: isPendingUpdate })}
							maxLength={100}
							aria-invalid={nameError ? 'true' : undefined}
							aria-describedby={nameError ? 'name-error' : undefined}
						/>
						{nameError && (
							<p id="name-error" className="mt-2 text-sm text-red-400" role="alert">
								{nameError}
							</p>
						)}
					</div>

					<div>
						<label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
							{m.organization_settings_description_label()}
						</label>
						<textarea
							id="description"
							value={description}
							onChange={handleDescriptionChange}
							placeholder={m.organization_settings_description_placeholder()}
							disabled={isPendingUpdate}
							className={textareaVariants({ disabled: isPendingUpdate })}
							maxLength={500}
							rows={4}
							aria-invalid={descriptionError ? 'true' : undefined}
							aria-describedby={descriptionError ? 'description-error' : undefined}
						/>
						{descriptionError && (
							<p id="description-error" className="mt-2 text-sm text-red-400" role="alert">
								{descriptionError}
							</p>
						)}
						<p className="mt-1 text-sm text-gray-500">{description.length}/500</p>
					</div>

					<div className="pt-4">
						<SubmitButton
							enabled={canSubmit}
							isSubmitting={isPendingUpdate}
							label={m.organization_settings_save()}
							loadingLabel={m.organization_settings_saving()}
						/>
					</div>
				</form>

				{successMessage && (
					<div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
						<p className="text-green-400">{successMessage}</p>
					</div>
				)}

				{errorMessage && (
					<div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
						<p className="text-red-400">{errorMessage}</p>
					</div>
				)}
			</div>

			{canDelete && (
				<div className="bg-slate-800 rounded-xl p-8 border border-red-500/30">
					<div className="flex items-start gap-4">
						<AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
						<div className="flex-1">
							<h2 className="text-xl font-semibold text-red-400 mb-2">
								{m.organization_settings_danger_zone()}
							</h2>
							<p className="text-gray-400 mb-4">{m.organization_settings_danger_description()}</p>
							<button
								type="button"
								onClick={onDeleteClick}
								disabled={isPendingDelete}
								className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
							>
								{isPendingDelete
									? m.organization_settings_deleting()
									: m.organization_settings_delete_button()}
							</button>
						</div>
					</div>

					{deleteErrorMessage && (
						<div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
							<p className="text-red-400">{deleteErrorMessage}</p>
						</div>
					)}
				</div>
			)}

			<DeleteConfirmationModal
				isOpen={showDeleteConfirm}
				organizationName={organization.name}
				isPending={isPendingDelete}
				onCancel={onDeleteCancel}
				onConfirm={onDeleteConfirm}
			/>
		</div>
	)
}
