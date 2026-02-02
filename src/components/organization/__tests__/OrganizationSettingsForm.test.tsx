import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { OrganizationSettingsForm } from '../OrganizationSettingsForm'
import type { OrganizationSettings } from '@/db/schema'
import { m } from '@/paraglide/messages'

const baseSettings: OrganizationSettings = {
	id: 'settings-id',
	organizationId: 'org-id',
	defaultMonthlyPrice: null,
	defaultYearlyPrice: null,
	brandColorPrimary: null,
	brandColorSecondary: null,
	brandLogoUrl: null,
	createdAt: new Date('2024-01-01'),
	updatedAt: new Date('2024-01-01'),
}

const defaultProps = {
	settings: baseSettings,
	successMessage: null,
	errorMessage: null,
	isPending: false,
	onSubmit: vi.fn(),
}

describe('OrganizationSettingsForm', () => {
	describe('rendering', () => {
		it('renders pricing title', () => {
			// Arrange & Act
			render(<OrganizationSettingsForm {...defaultProps} />)

			// Assert
			expect(screen.getByText(m.organization_settings_pricing_title())).toBeInTheDocument()
		})

		it('renders pricing description', () => {
			// Arrange & Act
			render(<OrganizationSettingsForm {...defaultProps} />)

			// Assert
			expect(screen.getByText(m.organization_settings_pricing_description())).toBeInTheDocument()
		})

		it('renders branding title', () => {
			// Arrange & Act
			render(<OrganizationSettingsForm {...defaultProps} />)

			// Assert
			expect(screen.getByText(m.organization_settings_branding_title())).toBeInTheDocument()
		})

		it('renders branding description', () => {
			// Arrange & Act
			render(<OrganizationSettingsForm {...defaultProps} />)

			// Assert
			expect(screen.getByText(m.organization_settings_branding_description())).toBeInTheDocument()
		})

		it('renders monthly price input', () => {
			// Arrange & Act
			render(<OrganizationSettingsForm {...defaultProps} />)

			// Assert
			expect(
				screen.getByLabelText(m.organization_settings_monthly_price_label()),
			).toBeInTheDocument()
		})

		it('renders yearly price input', () => {
			// Arrange & Act
			render(<OrganizationSettingsForm {...defaultProps} />)

			// Assert
			expect(
				screen.getByLabelText(m.organization_settings_yearly_price_label()),
			).toBeInTheDocument()
		})

		it('renders primary color input', () => {
			// Arrange & Act
			render(<OrganizationSettingsForm {...defaultProps} />)

			// Assert
			expect(
				screen.getByLabelText(m.organization_settings_primary_color_label()),
			).toBeInTheDocument()
		})

		it('renders secondary color input', () => {
			// Arrange & Act
			render(<OrganizationSettingsForm {...defaultProps} />)

			// Assert
			expect(
				screen.getByLabelText(m.organization_settings_secondary_color_label()),
			).toBeInTheDocument()
		})

		it('renders logo URL input', () => {
			// Arrange & Act
			render(<OrganizationSettingsForm {...defaultProps} />)

			// Assert
			expect(screen.getByLabelText(m.organization_settings_logo_url_label())).toBeInTheDocument()
		})

		it('renders save button', () => {
			// Arrange & Act
			render(<OrganizationSettingsForm {...defaultProps} />)

			// Assert
			expect(
				screen.getByRole('button', { name: m.organization_settings_defaults_save() }),
			).toBeInTheDocument()
		})
	})

	describe('initial values', () => {
		it('displays existing monthly price in dollars', () => {
			// Arrange - 999 cents stored in settings
			const settings = { ...baseSettings, defaultMonthlyPrice: 999 }

			// Act
			render(<OrganizationSettingsForm {...defaultProps} settings={settings} />)

			// Assert - displayed as dollars (9.99)
			const input = screen.getByLabelText(m.organization_settings_monthly_price_label())
			expect(input).toHaveValue(9.99)
		})

		it('displays existing yearly price in dollars', () => {
			// Arrange - 9999 cents stored in settings
			const settings = { ...baseSettings, defaultYearlyPrice: 9999 }

			// Act
			render(<OrganizationSettingsForm {...defaultProps} settings={settings} />)

			// Assert - displayed as dollars (99.99)
			const input = screen.getByLabelText(m.organization_settings_yearly_price_label())
			expect(input).toHaveValue(99.99)
		})

		it('displays existing primary color', () => {
			// Arrange
			const settings = { ...baseSettings, brandColorPrimary: '#FF5733' }

			// Act
			render(<OrganizationSettingsForm {...defaultProps} settings={settings} />)

			// Assert
			const input = screen.getByLabelText(m.organization_settings_primary_color_label())
			expect(input).toHaveValue('#FF5733')
		})

		it('displays existing secondary color', () => {
			// Arrange
			const settings = { ...baseSettings, brandColorSecondary: '#3498DB' }

			// Act
			render(<OrganizationSettingsForm {...defaultProps} settings={settings} />)

			// Assert
			const input = screen.getByLabelText(m.organization_settings_secondary_color_label())
			expect(input).toHaveValue('#3498DB')
		})

		it('displays existing logo URL', () => {
			// Arrange
			const settings = { ...baseSettings, brandLogoUrl: 'https://example.com/logo.png' }

			// Act
			render(<OrganizationSettingsForm {...defaultProps} settings={settings} />)

			// Assert
			const input = screen.getByLabelText(m.organization_settings_logo_url_label())
			expect(input).toHaveValue('https://example.com/logo.png')
		})
	})

	describe('validation', () => {
		it('shows error for invalid monthly price', async () => {
			// Arrange
			const user = userEvent.setup()
			const onSubmit = vi.fn()
			render(<OrganizationSettingsForm {...defaultProps} onSubmit={onSubmit} />)

			// Act - type 0 which is invalid (must be positive)
			const monthlyInput = screen.getByLabelText(m.organization_settings_monthly_price_label())
			await user.type(monthlyInput, '0')
			const form = screen.getByRole('button', { name: m.organization_settings_defaults_save() })
			await user.click(form)

			// Assert
			expect(await screen.findByText(m.organization_settings_invalid_price())).toBeInTheDocument()
			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('shows error for invalid hex color', async () => {
			// Arrange
			const user = userEvent.setup()
			const onSubmit = vi.fn()
			render(<OrganizationSettingsForm {...defaultProps} onSubmit={onSubmit} />)

			// Act
			const colorInput = screen.getByLabelText(m.organization_settings_primary_color_label())
			await user.type(colorInput, 'not-a-color')
			const form = screen.getByRole('button', { name: m.organization_settings_defaults_save() })
			await user.click(form)

			// Assert
			expect(screen.getByText(m.organization_settings_invalid_hex_color())).toBeInTheDocument()
			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('shows error for invalid URL', async () => {
			// Arrange
			const user = userEvent.setup()
			const onSubmit = vi.fn()
			render(<OrganizationSettingsForm {...defaultProps} onSubmit={onSubmit} />)

			// Act
			const urlInput = screen.getByLabelText(m.organization_settings_logo_url_label())
			await user.type(urlInput, 'not-a-url')
			const form = screen.getByRole('button', { name: m.organization_settings_defaults_save() })
			await user.click(form)

			// Assert
			expect(await screen.findByText(m.organization_settings_invalid_url())).toBeInTheDocument()
			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('accepts valid hex color with 3 digits', async () => {
			// Arrange
			const user = userEvent.setup()
			const onSubmit = vi.fn()
			render(<OrganizationSettingsForm {...defaultProps} onSubmit={onSubmit} />)

			// Act
			const colorInput = screen.getByLabelText(m.organization_settings_primary_color_label())
			await user.type(colorInput, '#F00')
			const form = screen.getByRole('button', { name: m.organization_settings_defaults_save() })
			await user.click(form)

			// Assert
			expect(
				screen.queryByText(m.organization_settings_invalid_hex_color()),
			).not.toBeInTheDocument()
			expect(onSubmit).toHaveBeenCalled()
		})

		it('accepts valid hex color with 6 digits', async () => {
			// Arrange
			const user = userEvent.setup()
			const onSubmit = vi.fn()
			render(<OrganizationSettingsForm {...defaultProps} onSubmit={onSubmit} />)

			// Act
			const colorInput = screen.getByLabelText(m.organization_settings_primary_color_label())
			await user.type(colorInput, '#FF5733')
			const form = screen.getByRole('button', { name: m.organization_settings_defaults_save() })
			await user.click(form)

			// Assert
			expect(
				screen.queryByText(m.organization_settings_invalid_hex_color()),
			).not.toBeInTheDocument()
			expect(onSubmit).toHaveBeenCalled()
		})
	})

	describe('form submission', () => {
		it('calls onSubmit with dollar input converted to cents', async () => {
			// Arrange
			const user = userEvent.setup()
			const onSubmit = vi.fn()
			render(<OrganizationSettingsForm {...defaultProps} onSubmit={onSubmit} />)

			// Act - user enters dollars
			const monthlyInput = screen.getByLabelText(m.organization_settings_monthly_price_label())
			await user.type(monthlyInput, '9.99')
			const form = screen.getByRole('button', { name: m.organization_settings_defaults_save() })
			await user.click(form)

			// Assert - submitted as cents
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					defaultMonthlyPrice: 999,
				}),
			)
		})

		it('calls onSubmit with changed branding values', async () => {
			// Arrange
			const user = userEvent.setup()
			const onSubmit = vi.fn()
			render(<OrganizationSettingsForm {...defaultProps} onSubmit={onSubmit} />)

			// Act
			const colorInput = screen.getByLabelText(m.organization_settings_primary_color_label())
			await user.type(colorInput, '#FF5733')
			const form = screen.getByRole('button', { name: m.organization_settings_defaults_save() })
			await user.click(form)

			// Assert
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					brandColorPrimary: '#FF5733',
				}),
			)
		})

		it('does not call onSubmit when no changes made', async () => {
			// Arrange
			const user = userEvent.setup()
			const onSubmit = vi.fn()
			render(<OrganizationSettingsForm {...defaultProps} onSubmit={onSubmit} />)

			// Act
			const form = screen.getByRole('button', { name: m.organization_settings_defaults_save() })
			await user.click(form)

			// Assert
			expect(onSubmit).not.toHaveBeenCalled()
		})

		it('clears field to null when emptied', async () => {
			// Arrange
			const user = userEvent.setup()
			const onSubmit = vi.fn()
			const settings = { ...baseSettings, defaultMonthlyPrice: 999 }
			render(<OrganizationSettingsForm {...defaultProps} settings={settings} onSubmit={onSubmit} />)

			// Act
			const monthlyInput = screen.getByLabelText(m.organization_settings_monthly_price_label())
			await user.clear(monthlyInput)
			const form = screen.getByRole('button', { name: m.organization_settings_defaults_save() })
			await user.click(form)

			// Assert
			expect(onSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					defaultMonthlyPrice: null,
				}),
			)
		})
	})

	describe('loading state', () => {
		it('disables inputs when pending', () => {
			// Arrange & Act
			render(<OrganizationSettingsForm {...defaultProps} isPending={true} />)

			// Assert
			expect(screen.getByLabelText(m.organization_settings_monthly_price_label())).toBeDisabled()
			expect(screen.getByLabelText(m.organization_settings_yearly_price_label())).toBeDisabled()
			expect(screen.getByLabelText(m.organization_settings_primary_color_label())).toBeDisabled()
			expect(screen.getByLabelText(m.organization_settings_secondary_color_label())).toBeDisabled()
			expect(screen.getByLabelText(m.organization_settings_logo_url_label())).toBeDisabled()
		})

		it('shows saving label when pending', () => {
			// Arrange & Act
			render(<OrganizationSettingsForm {...defaultProps} isPending={true} />)

			// Assert
			expect(
				screen.getByRole('button', { name: m.organization_settings_defaults_saving() }),
			).toBeInTheDocument()
		})
	})

	describe('messages', () => {
		it('shows success message when provided', () => {
			// Arrange & Act
			render(
				<OrganizationSettingsForm
					{...defaultProps}
					successMessage={m.organization_settings_defaults_save_success()}
				/>,
			)

			// Assert
			expect(screen.getByText(m.organization_settings_defaults_save_success())).toBeInTheDocument()
		})

		it('shows error message when provided', () => {
			// Arrange & Act
			render(
				<OrganizationSettingsForm
					{...defaultProps}
					errorMessage={m.organization_settings_defaults_save_error()}
				/>,
			)

			// Assert
			expect(screen.getByText(m.organization_settings_defaults_save_error())).toBeInTheDocument()
		})
	})

	describe('color picker', () => {
		it('updates text input when color picker changes', () => {
			// Arrange
			render(<OrganizationSettingsForm {...defaultProps} />)
			const colorPicker = document.getElementById('primaryColorPicker') as HTMLInputElement
			const textInput = screen.getByLabelText(m.organization_settings_primary_color_label())

			// Act - color picker returns lowercase hex values
			fireEvent.change(colorPicker, { target: { value: '#ff0000' } })

			// Assert
			expect(textInput).toHaveValue('#ff0000')
		})
	})
})
