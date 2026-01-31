import { Link } from '@tanstack/react-router'
import { cva } from 'class-variance-authority'
import { ArrowLeft, Building2 } from 'lucide-react'
import { m } from '@/paraglide/messages'

const navLinkVariants = cva('flex items-center gap-3 p-3 rounded-lg transition-colors', {
	variants: {
		active: {
			true: 'bg-cyan-600 text-white hover:bg-cyan-700',
			false: 'text-gray-300 hover:bg-slate-700 hover:text-white',
		},
	},
	defaultVariants: {
		active: false,
	},
})

/**
 * ## PublisherAccessDenied
 *
 * Displayed when a non-publisher user tries to access the publisher area.
 *
 * @example
 * <PublisherAccessDenied />
 */
export function PublisherAccessDenied() {
	return (
		<div className="min-h-screen bg-slate-900 flex items-center justify-center">
			<div className="max-w-md mx-auto px-4 text-center">
				<div className="bg-slate-800 rounded-xl p-8">
					<Building2 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
					<h1 className="text-xl font-semibold text-white mb-2">
						{m.publisher_access_denied_title()}
					</h1>
					<p className="text-gray-400 mb-6">{m.publisher_access_denied_description()}</p>
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
					>
						<ArrowLeft size={20} />
						<span>{m.publisher_back_to_home()}</span>
					</Link>
				</div>
			</div>
		</div>
	)
}

/**
 * ## PublisherLayout
 *
 * Layout component for the publisher area. Provides a sidebar with navigation
 * to different publisher sections.
 *
 * @example
 * <PublisherLayout>
 *   <OrganizationsList />
 * </PublisherLayout>
 */
export function PublisherLayout(props: { children: React.ReactNode }) {
	const { children } = props

	return (
		<div className="min-h-screen bg-slate-900">
			<div className="max-w-6xl mx-auto px-4 py-8">
				<div className="mb-6">
					<Link
						to="/"
						className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
					>
						<ArrowLeft size={20} />
						<span>{m.publisher_back_to_home()}</span>
					</Link>
				</div>

				<div className="flex flex-col md:flex-row gap-8">
					<aside className="w-full md:w-64 flex-shrink-0">
						<nav className="bg-slate-800 rounded-xl p-4">
							<h2 className="text-lg font-semibold text-white mb-4">{m.publisher_page_title()}</h2>
							<ul className="space-y-2">
								<li>
									<Link
										to="/publisher/organizations"
										className={navLinkVariants()}
										activeProps={{
											className: navLinkVariants({ active: true }),
										}}
									>
										<Building2 size={20} />
										<span>{m.publisher_nav_organizations()}</span>
									</Link>
								</li>
							</ul>
						</nav>
					</aside>

					<main className="flex-1">{children}</main>
				</div>
			</div>
		</div>
	)
}
