import { cva } from 'class-variance-authority'
import { formatDollarsToUsd } from './priceFormatting'
import { cn } from '@/lib/cn'

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
 * A dollar input component for price values. Users enter prices in dollars
 * (e.g., "9.99") and see a formatted USD preview below the input. The value
 * is converted to cents for storage. Displays a label, the input field with
 * a $ prefix, a formatted preview, and an optional error message.
 *
 * @example
 * <PriceInput
 *   id="monthlyPrice"
 *   label="Monthly Price"
 *   value={monthlyPrice}
 *   placeholder="9.99"
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

	const formattedPreview = formatDollarsToUsd(value)

	return (
		<div>
			<label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">
				{label}
			</label>
			<div className="relative">
				<span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
				<input
					type="number"
					id={id}
					value={value}
					onChange={handleChange}
					placeholder={placeholder}
					disabled={disabled}
					className={cn(inputVariants({ disabled }), 'pl-8')}
					min="0.01"
					step="0.01"
					aria-invalid={error ? 'true' : undefined}
					aria-describedby={error ? `${id}-error` : `${id}-preview`}
				/>
			</div>
			{formattedPreview && !error && (
				<p id={`${id}-preview`} className="mt-2 text-sm text-gray-400">
					{formattedPreview}
				</p>
			)}
			{error && (
				<p id={`${id}-error`} className="mt-2 text-sm text-red-400" role="alert">
					{error}
				</p>
			)}
		</div>
	)
}
