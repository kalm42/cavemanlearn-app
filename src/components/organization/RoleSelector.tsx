import { cva } from 'class-variance-authority'
import type { NonOwnerRole } from '@/lib/validation/organization-members'
import { m } from '@/paraglide/messages'

const selectVariants = cva(
	'w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white transition-colors appearance-none cursor-pointer',
	{
		variants: {
			disabled: {
				true: 'opacity-50 cursor-not-allowed',
				false:
					'hover:border-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none',
			},
		},
		defaultVariants: {
			disabled: false,
		},
	},
)

const NON_OWNER_ROLES: Array<NonOwnerRole> = ['admin', 'editor', 'writer', 'viewer']

/**
 * ## getRoleLabel
 *
 * Returns the localized display label for an organization role.
 * Maps each role to its corresponding i18n message.
 *
 * @example
 * const label = getRoleLabel('admin')
 * // Returns "Admin" (localized)
 */
export function getRoleLabel(role: string): string {
	switch (role) {
		case 'owner':
			return m.organization_role_owner()
		case 'admin':
			return m.organization_role_admin()
		case 'editor':
			return m.organization_role_editor()
		case 'writer':
			return m.organization_role_writer()
		case 'viewer':
			return m.organization_role_viewer()
		default:
			return role
	}
}

interface RoleSelectorProps {
	value: NonOwnerRole
	onChange: (role: NonOwnerRole) => void
	disabled?: boolean
	id?: string
	'aria-label'?: string
}

/**
 * ## RoleSelector
 *
 * Dropdown component for selecting organization member roles. Excludes the 'owner' role
 * since owner cannot be assigned through the UI. Supports disabled state for loading
 * or permission restrictions.
 *
 * @example
 * <RoleSelector
 *   value={member.role}
 *   onChange={(newRole) => handleRoleChange(member.id, newRole)}
 *   disabled={isPending}
 * />
 */
export function RoleSelector(props: RoleSelectorProps) {
	const { value, onChange, disabled = false, id, 'aria-label': ariaLabel } = props

	function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
		onChange(e.target.value as NonOwnerRole)
	}

	return (
		<select
			id={id}
			value={value}
			onChange={handleChange}
			disabled={disabled}
			className={selectVariants({ disabled })}
			aria-label={ariaLabel ?? m.organization_members_add_role_label()}
		>
			{NON_OWNER_ROLES.map((role) => (
				<option key={role} value={role}>
					{getRoleLabel(role)}
				</option>
			))}
		</select>
	)
}
