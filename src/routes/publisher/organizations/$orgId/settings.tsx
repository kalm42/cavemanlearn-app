import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Suspense, useEffect, useState } from 'react'
import { LoadingScreen } from '@/components/LoadingScreen'
import { OrganizationSettings } from '@/components/organization/OrganizationSettings'
import { useDeleteOrganization } from '@/hooks/useDeleteOrganization'
import { useSuspenseOrganization } from '@/hooks/useSuspenseOrganization'
import { useUpdateOrganization } from '@/hooks/useUpdateOrganization'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/publisher/organizations/$orgId/settings')({
	component: OrganizationSettingsRoute,
})

function OrganizationSettingsRoute() {
	const { orgId } = Route.useParams()

	return (
		<Suspense fallback={<LoadingScreen />}>
			<OrganizationSettingsLoader orgId={orgId} />
		</Suspense>
	)
}

function OrganizationSettingsLoader(props: { orgId: string }) {
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

	const org = organization

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

		const hasChanges = name !== org.name || description !== (org.description ?? '')
		if (!hasChanges) {
			return
		}

		const updateData: { name?: string; description?: string | null } = {}

		if (name !== org.name) {
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

		if (description !== (org.description ?? '')) {
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

	return (
		<OrganizationSettings
			organization={org}
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
	)
}
