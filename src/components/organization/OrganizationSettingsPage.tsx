import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { OrganizationSettings } from './OrganizationSettings'
import { OrganizationSettingsForm } from './OrganizationSettingsForm'
import type { OrganizationWithRole } from '@/db/validators'
import type { OrganizationSettings as OrganizationSettingsType } from '@/db/schema'
import { useDeleteOrganization } from '@/hooks/useDeleteOrganization'
import { useUpdateOrganization } from '@/hooks/useUpdateOrganization'
import { useUpdateOrganizationSettings } from '@/hooks/useUpdateOrganizationSettings'
import { m } from '@/paraglide/messages'

export type OrganizationSettingsPageProps = {
	organization: OrganizationWithRole
	settings: OrganizationSettingsType | null
}

/**
 * ## OrganizationSettingsPage
 *
 * Page component that orchestrates the organization settings UI. Manages state
 * for both general settings (name, description) and default settings (pricing,
 * branding). Handles mutations for updating and deleting the organization.
 *
 * @example
 * <OrganizationSettingsPage
 *   organization={organization}
 *   settings={settings}
 * />
 */
export function OrganizationSettingsPage(props: OrganizationSettingsPageProps) {
	const { organization, settings } = props
	const navigate = useNavigate()

	const [name, setName] = useState(organization.name)
	const [description, setDescription] = useState(organization.description ?? '')
	const [nameError, setNameError] = useState<string | null>(null)
	const [descriptionError, setDescriptionError] = useState<string | null>(null)
	const [successMessage, setSuccessMessage] = useState<string | null>(null)
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

	const [defaultsSuccessMessage, setDefaultsSuccessMessage] = useState<string | null>(null)

	const updateMutation = useUpdateOrganization(organization.id, {
		onSuccess: () => {
			setSuccessMessage(m.organization_settings_save_success())
		},
	})

	const deleteMutation = useDeleteOrganization(organization.id, {
		onSuccess: () => {
			void navigate({ to: '/publisher/organizations' })
		},
	})

	const updateSettingsMutation = useUpdateOrganizationSettings(organization.id, {
		onSuccess: () => {
			setDefaultsSuccessMessage(m.organization_settings_defaults_save_success())
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

	useEffect(() => {
		if (!defaultsSuccessMessage) {
			return
		}
		const timer = setTimeout(() => {
			setDefaultsSuccessMessage(null)
		}, 3000)
		return () => {
			clearTimeout(timer)
		}
	}, [defaultsSuccessMessage])

	function handleNameChange(value: string) {
		setName(value)
		if (nameError) {
			setNameError(null)
		}
	}

	function handleDescriptionChange(value: string) {
		setDescription(value)
		if (descriptionError) {
			setDescriptionError(null)
		}
	}

	function handleSubmit() {
		setSuccessMessage(null)

		const hasChanges =
			name !== organization.name || description !== (organization.description ?? '')
		if (!hasChanges) {
			return
		}

		const updateData: { name?: string; description?: string | null } = {}

		if (name !== organization.name) {
			if (name.trim().length === 0) {
				setNameError(m.organization_create_name_required())
				return
			}
			if (name.length > 100) {
				setNameError(m.organization_create_name_max_length())
				return
			}
			updateData.name = name
		}

		if (description !== (organization.description ?? '')) {
			if (description.length > 500) {
				setDescriptionError(m.organization_create_description_max_length())
				return
			}
			updateData.description = description || null
		}

		void updateMutation.mutateAsync(updateData)
	}

	function handleDeleteClick() {
		setShowDeleteConfirm(true)
	}

	function handleDeleteCancel() {
		setShowDeleteConfirm(false)
	}

	function handleDeleteConfirm() {
		void deleteMutation.mutateAsync()
	}

	function handleSettingsSubmit(data: {
		defaultMonthlyPrice?: number | null
		defaultYearlyPrice?: number | null
		brandColorPrimary?: string | null
		brandColorSecondary?: string | null
		brandLogoUrl?: string | null
	}) {
		setDefaultsSuccessMessage(null)
		void updateSettingsMutation.mutateAsync(data)
	}

	return (
		<div className="space-y-6">
			<OrganizationSettings
				organization={organization}
				name={name}
				description={description}
				nameError={nameError}
				descriptionError={descriptionError}
				successMessage={successMessage}
				errorMessage={updateMutation.error ? m.organization_settings_save_error() : null}
				deleteErrorMessage={deleteMutation.error ? m.organization_settings_delete_error() : null}
				showDeleteConfirm={showDeleteConfirm}
				isPendingUpdate={updateMutation.isPending}
				isPendingDelete={deleteMutation.isPending}
				onNameChange={handleNameChange}
				onDescriptionChange={handleDescriptionChange}
				onSubmit={handleSubmit}
				onDeleteClick={handleDeleteClick}
				onDeleteCancel={handleDeleteCancel}
				onDeleteConfirm={handleDeleteConfirm}
			/>

			{settings && (
				<OrganizationSettingsForm
					settings={settings}
					successMessage={defaultsSuccessMessage}
					errorMessage={
						updateSettingsMutation.error ? m.organization_settings_defaults_save_error() : null
					}
					isPending={updateSettingsMutation.isPending}
					onSubmit={handleSettingsSubmit}
				/>
			)}
		</div>
	)
}
