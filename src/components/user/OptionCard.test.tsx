import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BookOpen } from 'lucide-react'
import OptionCard from './OptionCard'
import { m } from '@/paraglide/messages'

describe('OptionCard', () => {
	it('calls onSelect when clicked', async () => {
		// Arrange
		const user = userEvent.setup()
		const onSelect = vi.fn()
		render(
			<OptionCard
				title="Test Title"
				description="Test Description"
				icon={BookOpen}
				selected={false}
				disabled={false}
				onSelect={onSelect}
			/>,
		)
		const button = screen.getByRole('button', { name: /test title/i })

		// Act
		await user.click(button)

		// Assert
		expect(onSelect).toHaveBeenCalledTimes(1)
	})

	it('shows selected indicator when selected', () => {
		// Arrange
		const onSelect = vi.fn()
		render(
			<OptionCard
				title="Test Title"
				description="Test Description"
				icon={BookOpen}
				selected={true}
				disabled={false}
				onSelect={onSelect}
			/>,
		)

		// Assert
		expect(screen.getByText(m.onboarding_selected_indicator())).toBeInTheDocument()
	})

	it('does not call onSelect when disabled', async () => {
		// Arrange
		const user = userEvent.setup()
		const onSelect = vi.fn()
		render(
			<OptionCard
				title="Test Title"
				description="Test Description"
				icon={BookOpen}
				selected={false}
				disabled={true}
				onSelect={onSelect}
			/>,
		)
		const button = screen.getByRole('button', { name: /test title/i })

		// Act
		await user.click(button)

		// Assert
		expect(onSelect).not.toHaveBeenCalled()
		expect(button).toBeDisabled()
	})
})
