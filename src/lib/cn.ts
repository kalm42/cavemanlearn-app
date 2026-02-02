import { clsx } from 'clsx'
import type { ClassValue } from 'clsx'

/**
 * ## cn
 *
 * Utility function for combining class names. Wraps clsx to provide
 * a consistent API for conditional and dynamic class name composition.
 * Can be extended in the future with tailwind-merge for deduplication.
 *
 * @example
 * cn('base-class', isActive && 'active', { 'hidden': !visible })
 *
 * @example
 * cn(buttonVariants({ size: 'lg' }), className)
 */
export function cn(...inputs: Array<ClassValue>) {
	return clsx(inputs)
}
