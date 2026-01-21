import { createFileRoute } from '@tanstack/react-router'
import { Suspense, useEffect, useState } from 'react'
import { LoadingScreen } from '@/components/LoadingScreen'
import ProfileForm from '@/components/user/ProfileForm'
import { useSuspenseUserProfile } from '@/hooks/useSuspenseUserProfile'
import { useUpdateUserProfile } from '@/hooks/useUpdateUserProfile'
import { m } from '@/paraglide/messages'

export const Route = createFileRoute('/settings/profile')({
	component: ProfileSettingsPage,
})

/**
 * ## ProfileSettingsPage
 *
 * Page component for viewing and editing user profile settings.
 * Displays the current profile information and allows users to
 * update their display name.
 *
 * @example
 * // Route is automatically registered via createFileRoute
 * // Users navigate to /settings/profile to access this page
 */
function ProfileSettingsPage() {
	return (
		<Suspense fallback={<LoadingScreen />}>
			<ProfileSettingsContent />
		</Suspense>
	)
}

/**
 * ## ProfileSettingsContent
 *
 * Content component that uses Suspense to load the user profile.
 * Handles the profile update mutation and displays success/error feedback.
 *
 * @example
 * <Suspense fallback={<LoadingScreen />}>
 *   <ProfileSettingsContent />
 * </Suspense>
 */
function ProfileSettingsContent() {
	const { profile } = useSuspenseUserProfile()
	const [successMessage, setSuccessMessage] = useState<string | null>(null)

	const updateProfileMutation = useUpdateUserProfile({
		onSuccess: () => {
			setSuccessMessage(m.settings_save_success())
		},
	})

	// Auto-dismiss success message after 3 seconds
	useEffect(() => {
		if (!successMessage) {
			return
		}

		const timer = setTimeout(() => {
			setSuccessMessage(null)
		}, 3000)

		return () => {
			clearTimeout(timer)
		}
	}, [successMessage])

	const handleSubmit = async (displayName: string) => {
		setSuccessMessage(null)
		await updateProfileMutation.mutateAsync({ displayName })
	}

	return (
		<div className="bg-slate-800 rounded-xl p-8">
			<h1 className="text-2xl font-bold text-white mb-6">{m.settings_profile_section()}</h1>

			<ProfileForm
				initialDisplayName={profile?.displayName ?? ''}
				email={profile?.email ?? ''}
				avatarUrl={profile?.avatarUrl ?? null}
				onSubmit={handleSubmit}
				isSubmitting={updateProfileMutation.isPending}
			/>

			{successMessage && (
				<div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
					<p className="text-green-400">{successMessage}</p>
				</div>
			)}

			{updateProfileMutation.error && (
				<div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
					<p className="text-red-400">{m.settings_save_error()}</p>
				</div>
			)}
		</div>
	)
}
