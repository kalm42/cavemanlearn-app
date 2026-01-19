import { useEffect } from 'react'
import OnboardingForm from './OnboardingForm'
import { ProfileCreationError } from './ProfileCreationError'
import type { UserType } from './OnboardingForm';
import type { useNavigate } from '@tanstack/react-router'
import type { useCreateUserProfile } from '@/hooks/useCreateUserProfile'
import { useSuspenseUserProfile } from '@/hooks/useSuspenseUserProfile'

interface OnboardingContentProps {
	navigate: ReturnType<typeof useNavigate>
	createProfileMutation: ReturnType<typeof useCreateUserProfile>
}

/**
 * ## OnboardingContent
 *
 * Renders the onboarding form content after the user profile has been loaded via Suspense.
 * Handles profile existence checks and form submission. Redirects users who already have
 * a profile away from the onboarding page.
 *
 * @example
 * // Used within Suspense boundary in OnboardingComponent
 * <Suspense fallback={<Loading />}>
 *   <OnboardingContent navigate={navigate} createProfileMutation={mutation} />
 * </Suspense>
 */
export function OnboardingContent(props: OnboardingContentProps) {
	const { navigate, createProfileMutation } = props
	const { profile } = useSuspenseUserProfile()

	const handleSubmit = async (userType: UserType) => {
		await createProfileMutation.mutateAsync(userType)
	}

	// Redirect if profile already exists
	useEffect(() => {
		if (profile) {
			// User already has a profile, redirect to home
			void navigate({ to: '/' })
		}
	}, [profile, navigate])

	// Don't render if profile exists (will redirect)
	if (profile) {
		return null
	}

	// Show onboarding form
	return (
		<div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
			<div className="container mx-auto">
				<OnboardingForm
					onSubmit={handleSubmit}
					isSubmitting={createProfileMutation.isPending}
				/>
				<ProfileCreationError error={createProfileMutation.error} />
			</div>
		</div>
	)
}
