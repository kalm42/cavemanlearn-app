import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { cva } from 'class-variance-authority'
import { AlertTriangle } from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'
import SubmitButton from '@/components/user/SubmitButton'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useDeleteOrganization } from '@/hooks/useDeleteOrganization'
import { useSuspenseOrganization } from '@/hooks/useSuspenseOrganization'
import { useUpdateOrganization } from '@/hooks/useUpdateOrganization'
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

export const Route = createFileRoute('/publisher/organizations/$orgId/settings')({
	component: OrganizationSettingsPage,
})

/**
 * ## OrganizationSettingsPage
 *
 * Settings page for a single organization. Allows admins+ to update organization
 * name and description, and owners to delete the organization. Shows access denied
 * if user doesn't have admin+ role.
 *
 * @example
 * // Route is automatically registered via createFileRoute
 * // Publishers navigate to /publisher/organizations/:orgId/settings
 */
function OrganizationSettingsPage() {
	const { orgId } = Route.useParams()

	return (
		<Suspense fallback={<LoadingScreen />}>
			<OrganizationSettingsContent orgId={orgId} />
		</Suspense>
	)
}

function OrganizationSettingsContent(props: { orgId: string }) {
	const { orgId } = props
	const navigate = useNavigate()
	const { organization } = useSuspenseOrganization(orgId)

	const [name, setName] = useState(organization?.name ?? '')
	const [description, setDescription] = useState(organization?.description ?? '')
	const [nameError, setNameError] = useState<string | null>(null)
	const [descriptionError, setDescriptionError] = useState<string | null>(null)
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

	const updateMutation = useUpdateOrganization(orgId, {
		onSuccess: () => {
			setSuccessMessage(m.organization_settings_save_success())
		},
	})

	const deleteMutation = useDeleteOrganization(orgId, {
		onSuccess: () => {
			void navigate({ to: '/publisher/organizations' })
		},
	})

	useEffect(() => {
		if (!successMessage) {
			return
		}
		const timer = setTimeout(() => {
			setSuccessMessage(null)
		}, 3000)
		return () => {
			clearTimeout(timer)
		}
	}, [successMessage])

	if (!organization) {
		return null
	}

	return (
		<OrganizationSettingsForm
			organization={organization}
			name={name}
			description={description}
			nameError={nameError}
			descriptionError={descriptionError}
			successMessage={successMessage}
			showDeleteConfirm={showDeleteConfirm}
			updateMutation={updateMutation}
			deleteMutation={deleteMutation}
			onNameChange={setName}
			onDescriptionChange={setDescription}
			onNameErrorChange={setNameError}
			onDescriptionErrorChange={setDescriptionError}
			onSuccessMessageChange={setSuccessMessage}
			onShowDeleteConfirmChange={setShowDeleteConfirm}
		/>
	)
}

function OrganizationSettingsForm(props: {
	organization: NonNullable<ReturnType<typeof useSuspenseOrganization>['organization']>
	name: string
	description: string
	nameError: string | null
	descriptionError: string | null
	successMessage: string | null
	showDeleteConfirm: boolean
	updateMutation: ReturnType<typeof useUpdateOrganization>
	deleteMutation: ReturnType<typeof useDeleteOrganization>
	onNameChange: (name: string) => void
	onDescriptionChange: (description: string) => void
	onNameErrorChange: (error: string | null) => void
	onDescriptionErrorChange: (error: string | null) => void
	onSuccessMessageChange: (message: string | null) => void
	onShowDeleteConfirmChange: (show: boolean) => void
}) {
	const {
		organization,
		name,
		description,
		nameError,
		descriptionError,
		successMessage,
		showDeleteConfirm,
		updateMutation,
		deleteMutation,
		onNameChange,
		onDescriptionChange,
		onNameErrorChange,
		onDescriptionErrorChange,
		onSuccessMessageChange,
		onShowDeleteConfirmChange,
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
		const value = e.target.value
		onNameChange(value)
		if (nameError) {
			onNameErrorChange(null)
		}
	}

	function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		const value = e.target.value
		onDescriptionChange(value)
		if (descriptionError) {
			onDescriptionErrorChange(null)
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		onSuccessMessageChange(null)

		if (!hasChanges) {
			return
		}

		const updateData: { name?: string; description?: string | null } = {}

		if (name !== organization.name) {
			if (name.trim().length === 0) {
				onNameErrorChange(m.organization_create_name_required())
				return
			}
			if (name.length > 100) {
				onNameErrorChange(m.organization_create_name_max_length())
				return
			}
			updateData.name = name
		}

		if (description !== (organization.description ?? '')) {
			if (description.length > 500) {
				onDescriptionErrorChange(m.organization_create_description_max_length())
				return
			}
			updateData.description = description || null
		}

		void updateMutation.mutateAsync(updateData)
	}

	function handleDeleteClick() {
		onShowDeleteConfirmChange(true)
	}

	function handleDeleteCancel() {
		onShowDeleteConfirmChange(false)
	}

	function handleDeleteConfirm() {
		void deleteMutation.mutateAsync()
	}

	const canSubmit =
		hasChanges &&
		name.trim().length > 0 &&
		name.length <= 100 &&
		description.length <= 500 &&
		!updateMutation.isPending

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
							disabled={updateMutation.isPending}
							className={inputVariants({ disabled: updateMutation.isPending })}
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
							disabled={updateMutation.isPending}
							className={textareaVariants({ disabled: updateMutation.isPending })}
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
							isSubmitting={updateMutation.isPending}
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

				{updateMutation.error && (
					<div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
						<p className="text-red-400">{m.organization_settings_save_error()}</p>
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
								onClick={handleDeleteClick}
								disabled={deleteMutation.isPending}
								className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
							>
								{deleteMutation.isPending
									? m.organization_settings_deleting()
									: m.organization_settings_delete_button()}
							</button>
						</div>
					</div>

					{deleteMutation.error && (
						<div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
							<p className="text-red-400">{m.organization_settings_delete_error()}</p>
						</div>
					)}
				</div>
			)}

			{showDeleteConfirm && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-slate-800 rounded-xl p-8 max-w-md mx-4">
						<h3 className="text-xl font-semibold text-white mb-4">
							{m.organization_settings_delete_confirm_title()}
						</h3>
						<p className="text-gray-400 mb-6">
							{m.organization_settings_delete_confirm_message({ name: organization.name })}
						</p>
						<div className="flex gap-4">
							<button
								type="button"
								onClick={handleDeleteCancel}
								disabled={deleteMutation.isPending}
								className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
							>
								{m.organization_settings_delete_cancel()}
							</button>
							<button
								type="button"
								onClick={handleDeleteConfirm}
								disabled={deleteMutation.isPending}
								className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors"
							>
								{deleteMutation.isPending
									? m.organization_settings_deleting()
									: m.organization_settings_delete_confirm_button()}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
