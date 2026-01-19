import { useState } from 'react'
import { BookOpen, Upload } from 'lucide-react'
import OptionCard from './OptionCard'
import SubmitButton from './SubmitButton'
import { m } from '@/paraglide/messages'

export type UserType = 'learner' | 'publisher'

interface OnboardingFormProps {
	onSubmit: (userType: UserType) => Promise<void>
	isSubmitting?: boolean
}

/**
 * ## OnboardingForm
 *
 * Form component for new user onboarding. Displays two option cards (learner and publisher)
 * allowing users to select their role. Submits the selected user type to create their profile.
 * Used on the `/onboarding` route to guide new users through role selection.
 *
 * @example
 * <OnboardingForm
 *   onSubmit={async (userType) => {
 *     await createProfile(userType)
 *   }}
 *   isSubmitting={isPending}
 * />
 */
export default function OnboardingForm(props: OnboardingFormProps) {
	const { onSubmit, isSubmitting = false } = props
	const [selectedType, setSelectedType] = useState<UserType | null>(null)
	const isLearner = selectedType === 'learner'
	const isPublisher = selectedType === 'publisher'
	const canSubmit = Boolean(selectedType && !isSubmitting)

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (selectedType) {
			void onSubmit(selectedType)
		}
	}

	const handleSelectLearner = () => {
		setSelectedType('learner')
	}

	const handleSelectPublisher = () => {
		setSelectedType('publisher')
	}

	return (
		<form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
			<div className="mb-8 text-center">
				<h1 className="text-4xl font-bold text-white mb-4">{m.onboarding_welcome_title()}</h1>
				<p className="text-xl text-gray-300">{m.onboarding_subtitle()}</p>
			</div>

			<div className="grid md:grid-cols-2 gap-6 mb-8">
				<OptionCard
					title={m.onboarding_option_learner_title()}
					description={m.onboarding_option_learner_description()}
					icon={BookOpen}
					selected={isLearner}
					disabled={isSubmitting}
					onSelect={handleSelectLearner}
				/>

				<OptionCard
					title={m.onboarding_option_publisher_title()}
					description={m.onboarding_option_publisher_description()}
					icon={Upload}
					selected={isPublisher}
					disabled={isSubmitting}
					onSelect={handleSelectPublisher}
				/>
			</div>

			<div className="flex justify-center">
				<SubmitButton
					enabled={canSubmit}
					isSubmitting={isSubmitting}
					label={m.onboarding_submit_continue()}
					loadingLabel={m.onboarding_submit_creating()}
				/>
			</div>
		</form>
	)
}
