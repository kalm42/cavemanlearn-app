import { cva } from 'class-variance-authority'

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

export type LogoUrlInputProps = {
	id: string
	label: string
	value: string
	placeholder: string
	error: string | null
	disabled: boolean
	onChange: (value: string) => void
}

/**
 * ## LogoUrlInput
 *
 * A URL input component for brand logo URLs with a live preview.
 * Shows the logo image when a valid URL is entered. Hides the preview
 * if the image fails to load.
 *
 * @example
 * <LogoUrlInput
 *   id="logoUrl"
 *   label="Brand Logo URL"
 *   value={logoUrl}
 *   placeholder="https://example.com/logo.png"
 *   error={logoUrlError}
 *   disabled={isPending}
 *   onChange={setLogoUrl}
 * />
 */
export function LogoUrlInput(props: LogoUrlInputProps) {
	const { id, label, value, placeholder, error, disabled, onChange } = props

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		onChange(e.target.value)
	}

	function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
		e.currentTarget.style.display = 'none'
	}

	const showPreview = value && !error

	return (
		<div>
			<label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">
				{label}
			</label>
			<input
				type="url"
				id={id}
				value={value}
				onChange={handleChange}
				placeholder={placeholder}
				disabled={disabled}
				className={inputVariants({ disabled })}
				aria-invalid={error ? 'true' : undefined}
				aria-describedby={error ? `${id}-error` : undefined}
			/>
			{error && (
				<p id={`${id}-error`} className="mt-2 text-sm text-red-400" role="alert">
					{error}
				</p>
			)}
			{showPreview && (
				<div className="mt-3">
					<img
						src={value}
						alt="Brand logo preview"
						className="max-h-16 rounded"
						onError={handleImageError}
					/>
				</div>
			)}
		</div>
	)
}
