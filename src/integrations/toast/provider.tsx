import { Toaster } from 'sonner'

interface ToastProviderProps {
	children: React.ReactNode
}

/**
 * ## ToastProvider
 *
 * Wraps the application with the Sonner toast provider. This should be placed
 * at the root of the application to enable toast notifications throughout.
 * SSR-safe implementation that only renders the Toaster on the client side.
 *
 * @example
 * <ToastProvider>
 *   <App />
 * </ToastProvider>
 */
export default function ToastProvider(props: ToastProviderProps) {
	const { children } = props

	if (typeof window === 'undefined') {
		return <>{children}</>
	}

	return (
		<>
			{children}
			<Toaster
				position="top-right"
				duration={4000}
				toastOptions={{
					className: 'border rounded-lg shadow-lg',
				}}
			/>
		</>
	)
}
