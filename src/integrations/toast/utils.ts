import { toast } from 'sonner'

/**
 * ## showSuccessToast
 *
 * Displays a success toast notification with green styling matching the app's
 * dark theme. Use this for successful operations like saved settings or
 * completed actions.
 *
 * @example
 * showSuccessToast(m.settings_save_success())
 *
 * @example
 * showSuccessToast('Profile updated successfully')
 */
export function showSuccessToast(message: string) {
	toast.success(message, {
		className: 'bg-green-900/30 border-green-500/50 text-green-400',
	})
}

/**
 * ## showErrorToast
 *
 * Displays an error toast notification with red styling matching the app's
 * dark theme. Use this for failed operations or errors that need user attention.
 *
 * @example
 * showErrorToast(m.settings_save_error())
 *
 * @example
 * showErrorToast('Failed to save changes')
 */
export function showErrorToast(message: string) {
	toast.error(message, {
		className: 'bg-red-900/30 border-red-500/50 text-red-400',
	})
}

/**
 * ## showInfoToast
 *
 * Displays an informational toast notification with cyan styling matching the
 * app's dark theme. Use this for neutral information that doesn't indicate
 * success or failure.
 *
 * @example
 * showInfoToast(m.feature_info())
 *
 * @example
 * showInfoToast('New features available')
 */
export function showInfoToast(message: string) {
	toast.info(message, {
		className: 'bg-cyan-600/30 border-cyan-500/50 text-cyan-400',
	})
}

/**
 * ## showWarningToast
 *
 * Displays a warning toast notification with amber styling matching the app's
 * dark theme. Use this for cautionary messages that need user attention but
 * are not errors.
 *
 * @example
 * showWarningToast(m.session_expiring())
 *
 * @example
 * showWarningToast('Your session will expire soon')
 */
export function showWarningToast(message: string) {
	toast.warning(message, {
		className: 'bg-amber-900/30 border-amber-500/50 text-amber-400',
	})
}
