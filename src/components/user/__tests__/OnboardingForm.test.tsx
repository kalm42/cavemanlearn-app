import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OnboardingForm from '../OnboardingForm'
import { m } from '@/paraglide/messages'

describe('OnboardingForm', () => {
	it('renders both learner and publisher options', () => {
		// Arrange
		const onSubmit = vi.fn()
		render(<OnboardingForm onSubmit={onSubmit} />)

		// Assert
		expect(screen.getByRole('heading', { name: m.onboarding_welcome_title() })).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: new RegExp(m.onboarding_option_learner_title(), 'i') }),
		).toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: new RegExp(m.onboarding_option_publisher_title(), 'i') }),
		).toBeInTheDocument()
	})

	it('allows selecting learner option', async () => {
		// Arrange
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<OnboardingForm onSubmit={onSubmit} />)
		const learnerButton = screen.getByRole('button', {
			name: new RegExp(m.onboarding_option_learner_title(), 'i'),
		})

		// Act
		await user.click(learnerButton)

		// Assert
		expect(screen.getByText(m.onboarding_selected_indicator())).toBeInTheDocument()
	})

	it('allows selecting publisher option', async () => {
		// Arrange
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<OnboardingForm onSubmit={onSubmit} />)
		const publisherButton = screen.getByRole('button', {
			name: new RegExp(m.onboarding_option_publisher_title(), 'i'),
		})

		// Act
		await user.click(publisherButton)

		// Assert
		expect(screen.getByText(m.onboarding_selected_indicator())).toBeInTheDocument()
	})

	it('calls onSubmit with learner when learner is selected and form is submitted', async () => {
		// Arrange
		const user = userEvent.setup()
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		render(<OnboardingForm onSubmit={onSubmit} />)
		const learnerButton = screen.getByRole('button', {
			name: new RegExp(m.onboarding_option_learner_title(), 'i'),
		})
		const submitButton = screen.getByRole('button', {
			name: new RegExp(m.onboarding_submit_continue(), 'i'),
		})

		// Act
		await user.click(learnerButton)
		await user.click(submitButton)

		// Assert
		expect(onSubmit).toHaveBeenCalledTimes(1)
		expect(onSubmit).toHaveBeenCalledWith('learner')
	})

	it('calls onSubmit with publisher when publisher is selected and form is submitted', async () => {
		// Arrange
		const user = userEvent.setup()
		const onSubmit = vi.fn().mockResolvedValue(undefined)
		render(<OnboardingForm onSubmit={onSubmit} />)
		const publisherButton = screen.getByRole('button', {
			name: new RegExp(m.onboarding_option_publisher_title(), 'i'),
		})
		const submitButton = screen.getByRole('button', {
			name: new RegExp(m.onboarding_submit_continue(), 'i'),
		})

		// Act
		await user.click(publisherButton)
		await user.click(submitButton)

		// Assert
		expect(onSubmit).toHaveBeenCalledTimes(1)
		expect(onSubmit).toHaveBeenCalledWith('publisher')
	})

	it('disables submit button when no option is selected', () => {
		// Arrange
		const onSubmit = vi.fn()
		render(<OnboardingForm onSubmit={onSubmit} />)

		// Assert
		const submitButton = screen.getByRole('button', {
			name: new RegExp(m.onboarding_submit_continue(), 'i'),
		})
		expect(submitButton).toBeDisabled()
	})

	it('enables submit button when an option is selected', async () => {
		// Arrange
		const user = userEvent.setup()
		const onSubmit = vi.fn()
		render(<OnboardingForm onSubmit={onSubmit} />)
		const learnerButton = screen.getByRole('button', {
			name: new RegExp(m.onboarding_option_learner_title(), 'i'),
		})
		const submitButton = screen.getByRole('button', {
			name: new RegExp(m.onboarding_submit_continue(), 'i'),
		})

		// Act
		await user.click(learnerButton)

		// Assert
		expect(submitButton).not.toBeDisabled()
	})

	it('shows loading state when isSubmitting is true', () => {
		// Arrange
		const onSubmit = vi.fn()
		render(<OnboardingForm onSubmit={onSubmit} isSubmitting={true} />)

		// Assert
		const submitButton = screen.getByRole('button', {
			name: new RegExp(m.onboarding_submit_creating(), 'i'),
		})
		expect(submitButton).toBeInTheDocument()
		expect(
			screen.queryByRole('button', { name: new RegExp(m.onboarding_submit_continue(), 'i') }),
		).not.toBeInTheDocument()
	})

	it('disables buttons when isSubmitting is true', () => {
		// Arrange
		const onSubmit = vi.fn()
		render(<OnboardingForm onSubmit={onSubmit} isSubmitting={true} />)

		// Assert
		const learnerButton = screen.getByRole('button', {
			name: new RegExp(m.onboarding_option_learner_title(), 'i'),
		})
		const publisherButton = screen.getByRole('button', {
			name: new RegExp(m.onboarding_option_publisher_title(), 'i'),
		})

		expect(learnerButton).toBeDisabled()
		expect(publisherButton).toBeDisabled()
	})
})
