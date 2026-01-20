import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/clerk-react'
import { cva } from 'class-variance-authority'
import { ArrowLeft, User } from 'lucide-react'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useRedirectIfUnauthenticated } from '@/hooks/useRedirectIfUnauthenticated'
import { m } from '@/paraglide/messages'

const navLinkVariants = cva(
	'flex items-center gap-3 p-3 rounded-lg transition-colors',
	{
		variants: {
			active: {
				true: 'bg-cyan-600 text-white hover:bg-cyan-700',
				false: 'text-gray-300 hover:bg-slate-700 hover:text-white',
			},
		},
		defaultVariants: {
			active: false,
		},
	},
)

export const Route = createFileRoute('/settings')({
	component: SettingsLayout,
})

/**
 * ## SettingsLayout
 *
 * Layout component for the settings area. Provides a sidebar with navigation
 * to different settings sections. Requires authentication - redirects to home
 * if user is not signed in.
 *
 * @example
 * // Route is automatically registered via createFileRoute
 * // Users navigate to /settings/* to access settings pages
 */
function SettingsLayout() {
	const { isLoaded: userLoaded, isSignedIn } = useUser()

	useRedirectIfUnauthenticated()

	if (!userLoaded) {
		return <LoadingScreen />
	}

	if (!isSignedIn) {
		return null
	}

	return (
		<div className="min-h-screen bg-slate-900">
			<div className="max-w-6xl mx-auto px-4 py-8">
				<div className="mb-6">
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
					>
						<ArrowLeft size={20} />
						<span>{m.settings_back_to_home()}</span>
					</Link>
				</div>

				<div className="flex flex-col md:flex-row gap-8">
					<aside className="w-full md:w-64 flex-shrink-0">
						<nav className="bg-slate-800 rounded-xl p-4">
							<h2 className="text-lg font-semibold text-white mb-4">{m.settings_page_title()}</h2>
							<ul className="space-y-2">
								<li>
									<Link
										to="/settings/profile"
										className={navLinkVariants({ active: false })}
										activeProps={{
											className: navLinkVariants({ active: true }),
										}}
									>
										<User size={20} />
										<span>{m.settings_nav_profile()}</span>
									</Link>
								</li>
							</ul>
						</nav>
					</aside>

					<main className="flex-1">
						<Outlet />
					</main>
				</div>
			</div>
		</div>
	)
}
