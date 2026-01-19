import { m } from '@/paraglide/messages'

/**
 * ## LoadingScreen
 *
 * Displays a full-screen loading screen with localized loading text.
 * Used as a fallback for Suspense boundaries and loading states throughout the application.
 *
 * @example
 * <Suspense fallback={<LoadingScreen />}>
 *   <AsyncComponent />
 * </Suspense>
 *
 * @example
 * if (isLoading) {
 *   return <LoadingScreen />
 * }
 */
export function LoadingScreen() {
	return (
		<div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
			<div className="text-white text-xl">{m.loading()}</div>
		</div>
	)
}
