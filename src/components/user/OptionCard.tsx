import { cva } from 'class-variance-authority'
import type { LucideIcon } from 'lucide-react'
import { m } from '@/paraglide/messages'

const optionButtonVariants = cva('p-8 rounded-xl border-2 transition-all text-left', {
	variants: {
		selected: {
			true: 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20',
			false: 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800',
		},
		disabled: {
			true: 'opacity-50 cursor-not-allowed',
			false: 'cursor-pointer',
		},
	},
	defaultVariants: {
		selected: false,
		disabled: false,
	},
})

const iconContainerVariants = cva('w-12 h-12 rounded-lg flex items-center justify-center', {
	variants: {
		selected: {
			true: 'bg-cyan-500 text-white',
			false: 'bg-slate-700 text-gray-300',
		},
	},
	defaultVariants: {
		selected: false,
	},
})

interface OptionCardProps {
	title: string
	description: string
	icon: LucideIcon
	selected: boolean
	disabled: boolean
	onSelect: () => void
}

/**
 * ## OptionCard
 *
 * Displays a selectable card option for the onboarding form. Shows an icon, title, and description.
 * Highlights when selected and shows a checkmark indicator. Used for choosing between learner
 * and publisher user types.
 *
 * @example
 * <OptionCard
 *   title="I want to learn"
 *   description="Browse and purchase learning decks"
 *   icon={BookOpen}
 *   selected={selectedType === 'learner'}
 *   disabled={isSubmitting}
 *   onSelect={() => setSelectedType('learner')}
 * />
 */
export default function OptionCard(props: OptionCardProps) {
	const { title, description, icon: Icon, selected, disabled, onSelect } = props

	return (
		<button
			type="button"
			onClick={onSelect}
			disabled={disabled}
			className={optionButtonVariants({ selected, disabled })}
		>
			<div className="flex items-center gap-4 mb-4">
				<div className={iconContainerVariants({ selected })}>
					<Icon size={24} />
				</div>
				<h2 className="text-2xl font-semibold text-white">{title}</h2>
			</div>
			<p className="text-gray-400 leading-relaxed">{description}</p>
			{selected && (
				<div className="mt-4 text-cyan-400 font-medium">{m.onboarding_selected_indicator()}</div>
			)}
		</button>
	)
}
