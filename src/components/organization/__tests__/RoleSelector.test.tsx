import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RoleSelector, getRoleLabel } from '../RoleSelector'
import { m } from '@/paraglide/messages'

describe('RoleSelector', () => {
	describe('rendering', () => {
		it('renders a select element', () => {
			// Arrange
			const onChange = vi.fn()

			// Act
			render(<RoleSelector value="viewer" onChange={onChange} />)

			// Assert
			const select = screen.getByRole('combobox')
			expect(select).toBeInTheDocument()
		})

		it('renders all non-owner roles as options', () => {
			// Arrange
			const onChange = vi.fn()

			// Act
			render(<RoleSelector value="viewer" onChange={onChange} />)

			// Assert
			expect(screen.getByRole('option', { name: m.organization_role_admin() })).toBeInTheDocument()
			expect(screen.getByRole('option', { name: m.organization_role_editor() })).toBeInTheDocument()
			expect(screen.getByRole('option', { name: m.organization_role_writer() })).toBeInTheDocument()
			expect(screen.getByRole('option', { name: m.organization_role_viewer() })).toBeInTheDocument()
		})

		it('does not include owner role as an option', () => {
			// Arrange
			const onChange = vi.fn()

			// Act
			render(<RoleSelector value="viewer" onChange={onChange} />)

			// Assert
			expect(
				screen.queryByRole('option', { name: m.organization_role_owner() }),
			).not.toBeInTheDocument()
		})

		it('displays the selected value', () => {
			// Arrange
			const onChange = vi.fn()

			// Act
			render(<RoleSelector value="editor" onChange={onChange} />)

			// Assert
			const select = screen.getByRole('combobox')
			expect(select).toHaveValue('editor')
		})

		it('applies custom id when provided', () => {
			// Arrange
			const onChange = vi.fn()

			// Act
			render(<RoleSelector value="viewer" onChange={onChange} id="custom-role-select" />)

			// Assert
			const select = screen.getByRole('combobox')
			expect(select).toHaveAttribute('id', 'custom-role-select')
		})

		it('applies custom aria-label when provided', () => {
			// Arrange
			const onChange = vi.fn()

			// Act
			render(<RoleSelector value="viewer" onChange={onChange} aria-label="Custom label" />)

			// Assert
			const select = screen.getByRole('combobox', { name: 'Custom label' })
			expect(select).toBeInTheDocument()
		})
	})

	describe('disabled state', () => {
		it('is enabled by default', () => {
			// Arrange
			const onChange = vi.fn()

			// Act
			render(<RoleSelector value="viewer" onChange={onChange} />)

			// Assert
			const select = screen.getByRole('combobox')
			expect(select).not.toBeDisabled()
		})

		it('is disabled when disabled prop is true', () => {
			// Arrange
			const onChange = vi.fn()

			// Act
			render(<RoleSelector value="viewer" onChange={onChange} disabled />)

			// Assert
			const select = screen.getByRole('combobox')
			expect(select).toBeDisabled()
		})
	})

	describe('selection behavior', () => {
		it('calls onChange with new role when selection changes', async () => {
			// Arrange
			const user = userEvent.setup()
			const onChange = vi.fn()
			render(<RoleSelector value="viewer" onChange={onChange} />)

			// Act
			const select = screen.getByRole('combobox')
			await user.selectOptions(select, 'admin')

			// Assert
			expect(onChange).toHaveBeenCalledTimes(1)
			expect(onChange).toHaveBeenCalledWith('admin')
		})

		it('can select each available role', async () => {
			// Arrange
			const user = userEvent.setup()
			const onChange = vi.fn()
			render(<RoleSelector value="viewer" onChange={onChange} />)
			const select = screen.getByRole('combobox')

			// Act & Assert
			await user.selectOptions(select, 'admin')
			expect(onChange).toHaveBeenLastCalledWith('admin')

			await user.selectOptions(select, 'editor')
			expect(onChange).toHaveBeenLastCalledWith('editor')

			await user.selectOptions(select, 'writer')
			expect(onChange).toHaveBeenLastCalledWith('writer')

			await user.selectOptions(select, 'viewer')
			expect(onChange).toHaveBeenLastCalledWith('viewer')
		})
	})
})

describe('getRoleLabel', () => {
	it('returns correct label for owner', () => {
		expect(getRoleLabel('owner')).toBe(m.organization_role_owner())
	})

	it('returns correct label for admin', () => {
		expect(getRoleLabel('admin')).toBe(m.organization_role_admin())
	})

	it('returns correct label for editor', () => {
		expect(getRoleLabel('editor')).toBe(m.organization_role_editor())
	})

	it('returns correct label for writer', () => {
		expect(getRoleLabel('writer')).toBe(m.organization_role_writer())
	})

	it('returns correct label for viewer', () => {
		expect(getRoleLabel('viewer')).toBe(m.organization_role_viewer())
	})

	it('returns the role itself for unknown roles', () => {
		expect(getRoleLabel('unknown-role')).toBe('unknown-role')
	})
})
