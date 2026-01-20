import { cva } from 'class-variance-authority'

const submitButtonVariants = cva('px-8 py-4 rounded-lg font-semibold text-lg transition-all', {
	variants: {
		enabled: {
			true: 'bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/50',
			false: 'bg-slate-700 text-gray-400 cursor-not-allowed',
		},
	},
	defaultVariants: {
		enabled: false,
	},
})

interface SubmitButtonProps {
	enabled: boolean
	isSubmitting: boolean
	label: string
	loadingLabel: string
}

/**
 * ## SubmitButton
 *
 * Generic submit button component that displays different text based on submission state.
 * Shows loading label when submitting and regular label when idle. Disabled when not enabled
 * or while submitting. Can be reused across different forms.
 *
 * @example
 * <SubmitButton
 *   enabled={canSubmit}
 *   isSubmitting={isPending}
 *   label="Continue"
 *   loadingLabel="Creating profile..."
 * />
 */
export default function SubmitButton(props: SubmitButtonProps) {
	const { enabled, isSubmitting, label, loadingLabel } = props

	return (
		<button
			type="submit"
			disabled={!enabled || isSubmitting}
			className={submitButtonVariants({ enabled })}
		>
			{isSubmitting ? loadingLabel : label}
		</button>
	)
}
