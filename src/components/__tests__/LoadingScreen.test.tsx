import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { LoadingScreen } from '../LoadingScreen'

describe('LoadingScreen', () => {
	it('renders loading text', () => {
		// Arrange
		const { container } = render(<LoadingScreen />)

		// Assert
		expect(container).toMatchSnapshot()
	})
})
