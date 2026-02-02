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

const colorPickerVariants = cva(
	'w-full h-12 rounded-lg bg-slate-700 border border-slate-600 cursor-pointer transition-colors',
	{
		variants: {
			disabled: {
				true: 'opacity-50 cursor-not-allowed',
				false: '',
			},
		},
		defaultVariants: {
			disabled: false,
		},
	},
)

export type ColorInputProps = {
	id: string
	label: string
	value: string
	defaultColor: string
	placeholder: string
	error: string | null
	disabled: boolean
	onChange: (value: string) => void
}

/**
 * ## ColorInput
 *
 * A color input component with both a color picker and a text input for hex values.
 * The color picker provides a visual way to select colors, while the text input
 * allows direct hex code entry. Used for brand color settings.
 *
 * @example
 * <ColorInput
 *   id="primaryColor"
 *   label="Primary Brand Color"
 *   value={primaryColor}
 *   defaultColor="#3B82F6"
 *   placeholder="#FF5733"
 *   error={primaryColorError}
 *   disabled={isPending}
 *   onChange={setPrimaryColor}
 * />
 */
export function ColorInput(props: ColorInputProps) {
	const { id, label, value, defaultColor, placeholder, error, disabled, onChange } = props

	function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
		onChange(e.target.value)
	}

	function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
		onChange(e.target.value)
	}

	return (
		<div>
			<label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">
				{label}
			</label>
			<div className="flex gap-3">
				<input
					type="color"
					id={`${id}Picker`}
					value={value || defaultColor}
					onChange={handlePickerChange}
					disabled={disabled}
					className={colorPickerVariants({ disabled })}
					style={{ width: '60px' }}
				/>
				<input
					type="text"
					id={id}
					value={value}
					onChange={handleTextChange}
					placeholder={placeholder}
					disabled={disabled}
					className={inputVariants({ disabled })}
					aria-invalid={error ? 'true' : undefined}
					aria-describedby={error ? `${id}-error` : undefined}
				/>
			</div>
			{error && (
				<p id={`${id}-error`} className="mt-2 text-sm text-red-400" role="alert">
					{error}
				</p>
			)}
		</div>
	)
}
