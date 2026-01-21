import { useState } from 'react'
import { cva } from 'class-variance-authority'
import SubmitButton from './SubmitButton'
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

const readOnlyInputVariants = cva(
	'w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 text-gray-400 cursor-not-allowed',
)

interface ProfileFormProps {
	initialDisplayName: string
	email: string
	avatarUrl: string | null
	onSubmit: (displayName: string) => Promise<void>
	isSubmitting?: boolean
}

/**
 * ## ProfileForm
 *
 * Form component for editing user profile information. Displays editable
 * display name field and read-only email and avatar fields. Validates
 * that the display name is between 1-100 characters before submission.
 *
 * @example
 * <ProfileForm
 *   initialDisplayName="John Doe"
 *   email="john@example.com"
 *   avatarUrl="https://example.com/avatar.png"
 *   onSubmit={async (displayName) => {
 *     await updateProfile({ displayName })
 *   }}
 *   isSubmitting={isPending}
 * />
 */
export default function ProfileForm(props: ProfileFormProps) {
	const { initialDisplayName, email, avatarUrl, onSubmit, isSubmitting = false } = props
	const [displayName, setDisplayName] = useState(initialDisplayName)
	const [validationError, setValidationError] = useState<string | null>(null)

	const hasChanges = displayName !== initialDisplayName
	const isValid = displayName.trim().length >= 1 && displayName.length <= 100
	const canSubmit = hasChanges && isValid && !isSubmitting

	const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value
		setDisplayName(value)
		setValidationError(null)

		if (value.length > 100) {
			setValidationError(m.settings_display_name_too_long())
		}
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()

		const trimmedDisplayName = displayName.trim()

		if (!trimmedDisplayName) {
			setValidationError(m.settings_display_name_required())
			return
		}

		if (trimmedDisplayName.length > 100) {
			setValidationError(m.settings_display_name_too_long())
			return
		}

		setDisplayName(trimmedDisplayName)
		void onSubmit(trimmedDisplayName)
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div>
				<label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
					{m.settings_display_name_label()}
				</label>
				<input
					type="text"
					id="displayName"
					value={displayName}
					onChange={handleDisplayNameChange}
					placeholder={m.settings_display_name_placeholder()}
					disabled={isSubmitting}
					className={inputVariants({ disabled: isSubmitting })}
					maxLength={100}
				/>
				{validationError && <p className="mt-2 text-sm text-red-400">{validationError}</p>}
			</div>

			<div>
				<label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
					{m.settings_email_label()}
				</label>
				<input
					type="email"
					id="email"
					value={email}
					disabled
					className={readOnlyInputVariants()}
					aria-describedby="email-description"
				/>
				<p id="email-description" className="mt-2 text-sm text-gray-500">
					{m.settings_email_readonly()}
				</p>
			</div>

			{avatarUrl && (
				<div>
					<label className="block text-sm font-medium text-gray-300 mb-2">
						{m.settings_avatar_label()}
					</label>
					<div className="flex items-center gap-4">
						<img
							src={avatarUrl}
							alt={m.settings_avatar_alt()}
							className="w-16 h-16 rounded-full border-2 border-slate-600"
						/>
						<p className="text-sm text-gray-500">{m.settings_avatar_readonly()}</p>
					</div>
				</div>
			)}

			<div className="pt-4">
				<SubmitButton
					enabled={canSubmit}
					isSubmitting={isSubmitting}
					label={m.settings_save_changes()}
					loadingLabel={m.settings_saving()}
				/>
			</div>
		</form>
	)
}
