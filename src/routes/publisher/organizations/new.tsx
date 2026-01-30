import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { OrganizationFormData } from '@/components/organization/OrganizationForm'
import OrganizationForm from '@/components/organization/OrganizationForm'
import { useCreateOrganization } from '@/hooks/useCreateOrganization'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/publisher/organizations/new')({
	component: CreateOrganizationPage,
})

/**
 * ## CreateOrganizationPage
 *
 * Page for creating a new organization. Displays a form for entering organization
 * name and description, with a live slug preview. On successful creation, redirects
 * to the new organization's dashboard page.
 *
 * @example
 * // Route is automatically registered via createFileRoute
 * // Publishers navigate to /publisher/organizations/new to create an org
 */
function CreateOrganizationPage() {
	const navigate = useNavigate()
	const [error, setError] = useState<string | null>(null)

	const createOrg = useCreateOrganization({
		onSuccess: (data) => {
			void navigate({
				to: '/publisher/organizations/$orgId',
				params: { orgId: data.organization.id },
			})
		},
	})

	async function handleSubmit(data: OrganizationFormData) {
		setError(null)
		try {
			await createOrg.mutateAsync(data)
		} catch (err) {
			// Check for duplicate slug error
			const message = err instanceof Error ? err.message : String(err)
			if (message.toLowerCase().includes('slug') || message.toLowerCase().includes('duplicate')) {
				setError(m.organization_create_error_duplicate())
			} else {
				setError(m.organization_create_error())
			}
		}
	}

	return (
		<div className="bg-slate-800 rounded-xl p-8 max-w-2xl">
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-white mb-2">{m.organization_create_title()}</h1>
				<p className="text-gray-400">{m.organization_create_subtitle()}</p>
			</div>

			{error && (
				<div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/50">
					<p className="text-red-400">{error}</p>
				</div>
			)}

			<OrganizationForm onSubmit={handleSubmit} isSubmitting={createOrg.isPending} />
		</div>
	)
}
