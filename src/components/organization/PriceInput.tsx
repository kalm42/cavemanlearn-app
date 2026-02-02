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

export type PriceInputProps = {
	id: string
	label: string
	value: string
	placeholder: string
	error: string | null
	disabled: boolean
	onChange: (value: string) => void
}

/**
 * ## PriceInput
 *
 * A number input component for price values in cents. Displays a label,
 * the input field, and an optional error message. Used for organization
 * default pricing settings.
 *
 * @example
 * <PriceInput
 *   id="monthlyPrice"
 *   label="Monthly Price (cents)"
 *   value={monthlyPrice}
 *   placeholder="e.g., 999 for $9.99"
 *   error={monthlyPriceError}
 *   disabled={isPending}
 *   onChange={setMonthlyPrice}
 * />
 */
export function PriceInput(props: PriceInputProps) {
	const { id, label, value, placeholder, error, disabled, onChange } = props

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		onChange(e.target.value)
	}

	return (
		<div>
			<label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">
				{label}
			</label>
			<input
				type="number"
				id={id}
				value={value}
				onChange={handleChange}
				placeholder={placeholder}
				disabled={disabled}
				className={inputVariants({ disabled })}
				min="1"
				step="1"
				aria-invalid={error ? 'true' : undefined}
				aria-describedby={error ? `${id}-error` : undefined}
			/>
			{error && (
				<p id={`${id}-error`} className="mt-2 text-sm text-red-400" role="alert">
					{error}
				</p>
			)}
		</div>
	)
}
