import { useMemo, useState } from 'react'
import { ColorInput } from './ColorInput'
import { LogoUrlInput } from './LogoUrlInput'
import { PriceInput } from './PriceInput'
import {
	parsePriceToNullable,
	parseStringToNullable,
	validateHexColor,
	validatePrice,
	validateUrl,
} from './settingsValidation'
import type { OrganizationSettings } from '@/db/schema'
import { m } from '@/paraglide/messages'
import SubmitButton from '@/components/user/SubmitButton'

export type OrganizationSettingsFormData = {
	defaultMonthlyPrice?: number | null
	defaultYearlyPrice?: number | null
	brandColorPrimary?: string | null
	brandColorSecondary?: string | null
	brandLogoUrl?: string | null
}

export type OrganizationSettingsFormProps = {
	settings: OrganizationSettings
	successMessage: string | null
	errorMessage: string | null
	isPending: boolean
	onSubmit: (data: OrganizationSettingsFormData) => void
}

/**
 * ## OrganizationSettingsForm
 *
 * Form component for managing organization default pricing and branding settings.
 * Includes inputs for monthly/yearly prices (in cents), brand colors (hex format),
 * and brand logo URL. Validates inputs before submission.
 *
 * @example
 * <OrganizationSettingsForm
 *   settings={settings}
 *   successMessage={successMessage}
 *   errorMessage={errorMessage}
 *   isPending={isPending}
 *   onSubmit={handleSubmit}
 * />
 */
export function OrganizationSettingsForm(props: OrganizationSettingsFormProps) {
	const { settings, successMessage, errorMessage, isPending, onSubmit } = props

	const [monthlyPrice, setMonthlyPrice] = useState(settings.defaultMonthlyPrice?.toString() ?? '')
	const [yearlyPrice, setYearlyPrice] = useState(settings.defaultYearlyPrice?.toString() ?? '')
	const [primaryColor, setPrimaryColor] = useState(settings.brandColorPrimary ?? '')
	const [secondaryColor, setSecondaryColor] = useState(settings.brandColorSecondary ?? '')
	const [logoUrl, setLogoUrl] = useState(settings.brandLogoUrl ?? '')

	const [monthlyPriceError, setMonthlyPriceError] = useState<string | null>(null)
	const [yearlyPriceError, setYearlyPriceError] = useState<string | null>(null)
	const [primaryColorError, setPrimaryColorError] = useState<string | null>(null)
	const [secondaryColorError, setSecondaryColorError] = useState<string | null>(null)
	const [logoUrlError, setLogoUrlError] = useState<string | null>(null)

	const hasChanges = useMemo(() => {
		return (
			parsePriceToNullable(monthlyPrice) !== settings.defaultMonthlyPrice ||
			parsePriceToNullable(yearlyPrice) !== settings.defaultYearlyPrice ||
			parseStringToNullable(primaryColor) !== settings.brandColorPrimary ||
			parseStringToNullable(secondaryColor) !== settings.brandColorSecondary ||
			parseStringToNullable(logoUrl) !== settings.brandLogoUrl
		)
	}, [monthlyPrice, yearlyPrice, primaryColor, secondaryColor, logoUrl, settings])

	function handleMonthlyPriceChange(value: string) {
		setMonthlyPrice(value)
		if (monthlyPriceError) {
			setMonthlyPriceError(null)
		}
	}

	function handleYearlyPriceChange(value: string) {
		setYearlyPrice(value)
		if (yearlyPriceError) {
			setYearlyPriceError(null)
		}
	}

	function handlePrimaryColorChange(value: string) {
		setPrimaryColor(value)
		if (primaryColorError) {
			setPrimaryColorError(null)
		}
	}

	function handleSecondaryColorChange(value: string) {
		setSecondaryColor(value)
		if (secondaryColorError) {
			setSecondaryColorError(null)
		}
	}

	function handleLogoUrlChange(value: string) {
		setLogoUrl(value)
		if (logoUrlError) {
			setLogoUrlError(null)
		}
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault()

		if (!hasChanges) {
			return
		}

		let hasErrors = false
		const data: OrganizationSettingsFormData = {}

		const validatedMonthly = validatePrice(monthlyPrice)
		if (validatedMonthly === undefined) {
			setMonthlyPriceError(m.organization_settings_invalid_price())
			hasErrors = true
		} else if (parsePriceToNullable(monthlyPrice) !== settings.defaultMonthlyPrice) {
			data.defaultMonthlyPrice = validatedMonthly
		}

		const validatedYearly = validatePrice(yearlyPrice)
		if (validatedYearly === undefined) {
			setYearlyPriceError(m.organization_settings_invalid_price())
			hasErrors = true
		} else if (parsePriceToNullable(yearlyPrice) !== settings.defaultYearlyPrice) {
			data.defaultYearlyPrice = validatedYearly
		}

		const validatedPrimary = validateHexColor(primaryColor)
		if (validatedPrimary === undefined) {
			setPrimaryColorError(m.organization_settings_invalid_hex_color())
			hasErrors = true
		} else if (parseStringToNullable(primaryColor) !== settings.brandColorPrimary) {
			data.brandColorPrimary = validatedPrimary
		}

		const validatedSecondary = validateHexColor(secondaryColor)
		if (validatedSecondary === undefined) {
			setSecondaryColorError(m.organization_settings_invalid_hex_color())
			hasErrors = true
		} else if (parseStringToNullable(secondaryColor) !== settings.brandColorSecondary) {
			data.brandColorSecondary = validatedSecondary
		}

		const validatedLogo = validateUrl(logoUrl)
		if (validatedLogo === undefined) {
			setLogoUrlError(m.organization_settings_invalid_url())
			hasErrors = true
		} else if (parseStringToNullable(logoUrl) !== settings.brandLogoUrl) {
			data.brandLogoUrl = validatedLogo
		}

		if (hasErrors || Object.keys(data).length === 0) {
			return
		}

		onSubmit(data)
	}

	const canSubmit = hasChanges && !isPending

	return (
		<div className="space-y-6">
			<div className="bg-slate-800 rounded-xl p-8">
				<h2 className="text-xl font-semibold text-white mb-2">
					{m.organization_settings_pricing_title()}
				</h2>
				<p className="text-gray-400 text-sm mb-6">
					{m.organization_settings_pricing_description()}
				</p>

				<form onSubmit={handleSubmit} className="space-y-6" noValidate>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<PriceInput
							id="monthlyPrice"
							label={m.organization_settings_monthly_price_label()}
							value={monthlyPrice}
							placeholder={m.organization_settings_monthly_price_placeholder()}
							error={monthlyPriceError}
							disabled={isPending}
							onChange={handleMonthlyPriceChange}
						/>
						<PriceInput
							id="yearlyPrice"
							label={m.organization_settings_yearly_price_label()}
							value={yearlyPrice}
							placeholder={m.organization_settings_yearly_price_placeholder()}
							error={yearlyPriceError}
							disabled={isPending}
							onChange={handleYearlyPriceChange}
						/>
					</div>

					<hr className="border-slate-700" />

					<div>
						<h3 className="text-lg font-medium text-white mb-2">
							{m.organization_settings_branding_title()}
						</h3>
						<p className="text-gray-400 text-sm mb-6">
							{m.organization_settings_branding_description()}
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<ColorInput
							id="primaryColor"
							label={m.organization_settings_primary_color_label()}
							value={primaryColor}
							defaultColor="#3B82F6"
							placeholder={m.organization_settings_primary_color_placeholder()}
							error={primaryColorError}
							disabled={isPending}
							onChange={handlePrimaryColorChange}
						/>
						<ColorInput
							id="secondaryColor"
							label={m.organization_settings_secondary_color_label()}
							value={secondaryColor}
							defaultColor="#10B981"
							placeholder={m.organization_settings_secondary_color_placeholder()}
							error={secondaryColorError}
							disabled={isPending}
							onChange={handleSecondaryColorChange}
						/>
					</div>

					<LogoUrlInput
						id="logoUrl"
						label={m.organization_settings_logo_url_label()}
						value={logoUrl}
						placeholder={m.organization_settings_logo_url_placeholder()}
						error={logoUrlError}
						disabled={isPending}
						onChange={handleLogoUrlChange}
					/>

					<div className="pt-4">
						<SubmitButton
							enabled={canSubmit}
							isSubmitting={isPending}
							label={m.organization_settings_defaults_save()}
							loadingLabel={m.organization_settings_defaults_saving()}
						/>
					</div>
				</form>

				{successMessage && (
					<div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
						<p className="text-green-400">{successMessage}</p>
					</div>
				)}

				{errorMessage && (
					<div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
						<p className="text-red-400">{errorMessage}</p>
					</div>
				)}
			</div>
		</div>
	)
}
