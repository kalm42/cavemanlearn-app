import { useState } from 'react'
import { cva } from 'class-variance-authority'
import SubmitButton from '../user/SubmitButton'
import { slugify } from '@/lib/slugify'
import { m } from '@/paraglide/messages'
import { createOrganizationRequestSchema } from '@/lib/validation/organization'

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

export interface OrganizationFormData {
	name: string
	description: string | null
}

interface OrganizationFormProps {
	onSubmit: (data: OrganizationFormData) => Promise<void>
	isSubmitting?: boolean
}

/**
 * ## OrganizationForm
 *
 * Form component for creating a new organization. Includes inputs for
 * organization name and description, with a live slug preview. Validates
 * that the name is between 1-100 characters and description is at most
 * 500 characters before submission.
 *
 * @example
 * <OrganizationForm
 *   onSubmit={async (data) => {
 *     await createOrganization(data)
 *   }}
 *   isSubmitting={isPending}
 * />
 */
export default function OrganizationForm(props: OrganizationFormProps) {
	const { onSubmit, isSubmitting = false } = props
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [nameError, setNameError] = useState<string | null>(null)
	const [descriptionError, setDescriptionError] = useState<string | null>(null)

	const slugPreview = slugify(name) || 'your-organization'

	function validateForm(): boolean {
		const result = createOrganizationRequestSchema.safeParse({
			name,
			description: description || undefined,
		})

		if (result.success) {
			setNameError(null)
			setDescriptionError(null)
			return true
		}

		// Map Zod errors to form fields
		setNameError(null)
		setDescriptionError(null)

		for (const issue of result.error.issues) {
			if (issue.path[0] === 'name') {
				if (issue.code === 'too_small') {
					setNameError(m.organization_create_name_required())
				} else {
					setNameError(m.organization_create_name_max_length())
				}
			}
			if (issue.path[0] === 'description') {
				setDescriptionError(m.organization_create_description_max_length())
			}
		}

		return false
	}

	// Check if form is valid for enabling submit button
	const validationResult = createOrganizationRequestSchema.safeParse({
		name,
		description: description || undefined,
	})
	const canSubmit = validationResult.success && !isSubmitting

	function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
		const value = e.target.value
		setName(value)
		// Clear error when user starts typing
		if (nameError) {
			setNameError(null)
		}
	}

	function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
		const value = e.target.value
		setDescription(value)
		// Clear error when user starts typing
		if (descriptionError) {
			setDescriptionError(null)
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()

		if (!validateForm()) {
			return
		}

		const data = validationResult.data
		if (!data) {
			return
		}

		setName(data.name)
		void onSubmit({
			name: data.name,
			description: data.description ?? null,
		})
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div>
				<label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
					{m.organization_create_name_label()}
				</label>
				<input
					type="text"
					id="name"
					value={name}
					onChange={handleNameChange}
					placeholder={m.organization_create_name_placeholder()}
					disabled={isSubmitting}
					className={inputVariants({ disabled: isSubmitting })}
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
					{m.organization_create_description_label()}
				</label>
				<textarea
					id="description"
					value={description}
					onChange={handleDescriptionChange}
					placeholder={m.organization_create_description_placeholder()}
					disabled={isSubmitting}
					className={textareaVariants({ disabled: isSubmitting })}
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

			<div>
				<label className="block text-sm font-medium text-gray-300 mb-2">
					{m.organization_create_slug_label()}
				</label>
				<div className="px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 text-gray-400">
					<span className="text-cyan-400">{slugPreview}</span>
				</div>
				<p className="mt-2 text-sm text-gray-500">
					{m.organization_create_slug_preview({ slug: slugPreview })}
				</p>
			</div>

			<div className="pt-4">
				<SubmitButton
					enabled={canSubmit}
					isSubmitting={isSubmitting}
					label={m.organization_create_submit()}
					loadingLabel={m.organization_create_submitting()}
				/>
			</div>
		</form>
	)
}
