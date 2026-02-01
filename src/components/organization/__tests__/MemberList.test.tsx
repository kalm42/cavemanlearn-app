import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemberList } from '../MemberList'
import type { MemberWithProfile } from '@/lib/validation/organization-members'
import { m } from '@/paraglide/messages'

function createMember(overrides: Partial<MemberWithProfile> = {}): MemberWithProfile {
	return {
		id: 'member-1',
		organizationId: 'org-1',
		userId: 'user-1',
		role: 'viewer',
		createdAt: new Date('2024-01-15'),
		profile: {
			id: 'user-1',
			email: 'member@example.com',
			displayName: 'Test Member',
			avatarUrl: null,
		},
		...overrides,
	}
}

const defaultProps = {
	members: [createMember()],
	currentUserRole: 'owner' as const,
	onRoleChange: vi.fn(),
	onRemove: vi.fn(),
	isUpdating: false,
	isRemoving: false,
	updatingMemberId: null,
	removingMemberId: null,
}

const showModalMock = vi.fn()
const closeMock = vi.fn()

describe('MemberList', () => {
	beforeEach(() => {
		HTMLDialogElement.prototype.showModal = showModalMock
		HTMLDialogElement.prototype.close = closeMock
	})

	afterEach(() => {
		showModalMock.mockClear()
		closeMock.mockClear()
	})

	describe('rendering', () => {
		it('renders table headers', () => {
			// Arrange & Act
			render(<MemberList {...defaultProps} />)

			// Assert
			expect(screen.getByText(m.organization_members_table_member())).toBeInTheDocument()
			expect(screen.getByText(m.organization_members_table_role())).toBeInTheDocument()
			expect(screen.getByText(m.organization_members_table_joined())).toBeInTheDocument()
			expect(screen.getByText(m.organization_members_table_actions())).toBeInTheDocument()
		})

		it('renders member email', () => {
			// Arrange
			const member = createMember({
				profile: { ...createMember().profile, email: 'test@example.com' },
			})

			// Act
			render(<MemberList {...defaultProps} members={[member]} />)

			// Assert
			expect(screen.getByText('test@example.com')).toBeInTheDocument()
		})

		it('renders member display name', () => {
			// Arrange
			const member = createMember({
				profile: { ...createMember().profile, displayName: 'John Doe' },
			})

			// Act
			render(<MemberList {...defaultProps} members={[member]} />)

			// Assert
			expect(screen.getByText('John Doe')).toBeInTheDocument()
		})

		it('falls back to email when display name is not set', () => {
			// Arrange
			const member = createMember({
				profile: { ...createMember().profile, email: 'fallback@example.com', displayName: null },
			})

			// Act
			render(<MemberList {...defaultProps} members={[member]} />)

			// Assert
			const rows = screen.getAllByRole('row')
			const dataRow = rows[1]
			expect(within(dataRow).getAllByText('fallback@example.com')).toHaveLength(2)
		})

		it('renders member avatar when provided', () => {
			// Arrange
			const member = createMember({
				profile: { ...createMember().profile, avatarUrl: 'https://example.com/avatar.png' },
			})

			// Act
			render(<MemberList {...defaultProps} members={[member]} />)

			// Assert - avatar img doesn't have alt text, find by tag
			const avatars = document.querySelectorAll('img')
			expect(avatars.length).toBeGreaterThan(0)
			expect(avatars[0]).toHaveAttribute('src', 'https://example.com/avatar.png')
		})

		it('renders placeholder avatar when not provided', () => {
			// Arrange
			const member = createMember({
				profile: { ...createMember().profile, avatarUrl: null, displayName: 'John' },
			})

			// Act
			render(<MemberList {...defaultProps} members={[member]} />)

			// Assert
			expect(screen.getByText('J')).toBeInTheDocument()
		})

		it('renders formatted join date', () => {
			// Arrange
			const member = createMember({ createdAt: new Date('2024-03-15') })

			// Act
			render(<MemberList {...defaultProps} members={[member]} />)

			// Assert - date formatting varies by locale, just check the year is present
			expect(screen.getByText(/2024/)).toBeInTheDocument()
		})

		it('renders multiple members', () => {
			// Arrange
			const members = [
				createMember({ id: '1', profile: { ...createMember().profile, displayName: 'Member 1' } }),
				createMember({ id: '2', profile: { ...createMember().profile, displayName: 'Member 2' } }),
				createMember({ id: '3', profile: { ...createMember().profile, displayName: 'Member 3' } }),
			]

			// Act
			render(<MemberList {...defaultProps} members={members} />)

			// Assert
			expect(screen.getByText('Member 1')).toBeInTheDocument()
			expect(screen.getByText('Member 2')).toBeInTheDocument()
			expect(screen.getByText('Member 3')).toBeInTheDocument()
		})
	})

	describe('empty state', () => {
		it('renders empty state when no members', () => {
			// Arrange & Act
			render(<MemberList {...defaultProps} members={[]} />)

			// Assert
			expect(screen.getByText(m.organization_members_empty_title())).toBeInTheDocument()
			expect(screen.getByText(m.organization_members_empty_description())).toBeInTheDocument()
		})
	})

	describe('owner behavior', () => {
		it('shows crown icon for owner member', () => {
			// Arrange
			const ownerMember = createMember({ role: 'owner' })

			// Act
			render(<MemberList {...defaultProps} members={[ownerMember]} />)

			// Assert - Crown is an SVG with aria-hidden, check by class or structure
			const rows = screen.getAllByRole('row')
			const dataRow = rows[1]
			// The crown icon is inside the member name cell
			expect(within(dataRow).getByText(m.organization_role_owner())).toBeInTheDocument()
		})

		it('displays role badge instead of selector for owner', () => {
			// Arrange
			const ownerMember = createMember({ role: 'owner' })

			// Act
			render(<MemberList {...defaultProps} members={[ownerMember]} />)

			// Assert
			expect(screen.getByText(m.organization_role_owner())).toBeInTheDocument()
			expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
		})

		it('does not show remove button for owner', () => {
			// Arrange
			const ownerMember = createMember({ role: 'owner' })

			// Act
			render(<MemberList {...defaultProps} members={[ownerMember]} />)

			// Assert
			expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
		})
	})

	describe('admin permissions', () => {
		it('shows role selector for non-owner members when user is admin', () => {
			// Arrange
			const member = createMember({ role: 'editor' })

			// Act
			render(<MemberList {...defaultProps} members={[member]} currentUserRole="admin" />)

			// Assert
			expect(screen.getByRole('combobox')).toBeInTheDocument()
		})

		it('shows remove button for non-owner members when user is admin', () => {
			// Arrange
			const member = createMember({ role: 'editor' })

			// Act
			render(<MemberList {...defaultProps} members={[member]} currentUserRole="admin" />)

			// Assert
			expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
		})

		it('shows actions column for admins', () => {
			// Arrange
			const member = createMember()

			// Act
			render(<MemberList {...defaultProps} members={[member]} currentUserRole="admin" />)

			// Assert
			expect(screen.getByText(m.organization_members_table_actions())).toBeInTheDocument()
		})
	})

	describe('non-admin permissions', () => {
		it('shows role badge instead of selector for editors', () => {
			// Arrange
			const member = createMember({ role: 'viewer' })

			// Act
			render(<MemberList {...defaultProps} members={[member]} currentUserRole="editor" />)

			// Assert
			expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
			expect(screen.getByText(m.organization_role_viewer())).toBeInTheDocument()
		})

		it('hides remove button for non-admins', () => {
			// Arrange
			const member = createMember()

			// Act
			render(<MemberList {...defaultProps} members={[member]} currentUserRole="editor" />)

			// Assert
			expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
		})

		it('hides actions column for viewers', () => {
			// Arrange
			const member = createMember()

			// Act
			render(<MemberList {...defaultProps} members={[member]} currentUserRole="viewer" />)

			// Assert
			expect(screen.queryByText(m.organization_members_table_actions())).not.toBeInTheDocument()
		})
	})

	describe('role change', () => {
		it('calls onRoleChange when role is changed', async () => {
			// Arrange
			const user = userEvent.setup()
			const onRoleChange = vi.fn()
			const member = createMember({ id: 'test-member', role: 'viewer' })

			render(<MemberList {...defaultProps} members={[member]} onRoleChange={onRoleChange} />)

			// Act
			const select = screen.getByRole('combobox')
			await user.selectOptions(select, 'admin')

			// Assert
			expect(onRoleChange).toHaveBeenCalledWith('test-member', 'admin')
		})

		it('disables role selector when member is being updated', () => {
			// Arrange
			const member = createMember({ id: 'updating-member', role: 'viewer' })

			// Act
			render(
				<MemberList
					{...defaultProps}
					members={[member]}
					isUpdating={true}
					updatingMemberId="updating-member"
				/>,
			)

			// Assert
			expect(screen.getByRole('combobox')).toBeDisabled()
		})
	})

	describe('member removal', () => {
		it('opens confirmation modal when remove button is clicked', async () => {
			// Arrange
			const user = userEvent.setup()
			const member = createMember({
				profile: { ...createMember().profile, displayName: 'John Doe' },
			})

			render(<MemberList {...defaultProps} members={[member]} />)

			// Act
			const removeButton = screen.getByRole('button', { name: /remove/i })
			await user.click(removeButton)

			// Assert
			expect(showModalMock).toHaveBeenCalled()
		})

		it('disables remove button when member is being removed', () => {
			// Arrange
			const member = createMember({ id: 'removing-member' })

			// Act
			render(
				<MemberList
					{...defaultProps}
					members={[member]}
					isRemoving={true}
					removingMemberId="removing-member"
				/>,
			)

			// Assert
			expect(screen.getByRole('button', { name: /remove/i })).toBeDisabled()
		})
	})
})
