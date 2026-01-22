import { describe, expect, it } from 'vitest'

import {
	InsufficientRoleError,
	canApproveQuestion,
	canDeleteOrganization,
	canEditDeck,
	canManageBilling,
	canManageMembers,
	canPublishDeck,
	hasMinimumRole,
} from '../permissions'

describe('hasMinimumRole', () => {
	it('returns true when role equals minimum role', () => {
		expect(hasMinimumRole('owner', 'owner')).toBe(true)
		expect(hasMinimumRole('admin', 'admin')).toBe(true)
		expect(hasMinimumRole('editor', 'editor')).toBe(true)
		expect(hasMinimumRole('writer', 'writer')).toBe(true)
		expect(hasMinimumRole('viewer', 'viewer')).toBe(true)
	})

	it('returns true when role exceeds minimum role', () => {
		expect(hasMinimumRole('owner', 'admin')).toBe(true)
		expect(hasMinimumRole('owner', 'viewer')).toBe(true)
		expect(hasMinimumRole('admin', 'editor')).toBe(true)
		expect(hasMinimumRole('editor', 'writer')).toBe(true)
		expect(hasMinimumRole('writer', 'viewer')).toBe(true)
	})

	it('returns false when role is below minimum role', () => {
		expect(hasMinimumRole('viewer', 'owner')).toBe(false)
		expect(hasMinimumRole('viewer', 'writer')).toBe(false)
		expect(hasMinimumRole('writer', 'editor')).toBe(false)
		expect(hasMinimumRole('editor', 'admin')).toBe(false)
		expect(hasMinimumRole('admin', 'owner')).toBe(false)
	})
})

describe('canEditDeck', () => {
	it('returns true for owner', () => {
		expect(canEditDeck('owner')).toBe(true)
	})

	it('returns true for admin', () => {
		expect(canEditDeck('admin')).toBe(true)
	})

	it('returns true for editor', () => {
		expect(canEditDeck('editor')).toBe(true)
	})

	it('returns true for writer', () => {
		expect(canEditDeck('writer')).toBe(true)
	})

	it('returns false for viewer', () => {
		expect(canEditDeck('viewer')).toBe(false)
	})
})

describe('canPublishDeck', () => {
	it('returns true for owner', () => {
		expect(canPublishDeck('owner')).toBe(true)
	})

	it('returns true for admin', () => {
		expect(canPublishDeck('admin')).toBe(true)
	})

	it('returns true for editor', () => {
		expect(canPublishDeck('editor')).toBe(true)
	})

	it('returns false for writer', () => {
		expect(canPublishDeck('writer')).toBe(false)
	})

	it('returns false for viewer', () => {
		expect(canPublishDeck('viewer')).toBe(false)
	})
})

describe('canApproveQuestion', () => {
	it('returns true for owner', () => {
		expect(canApproveQuestion('owner')).toBe(true)
	})

	it('returns true for admin', () => {
		expect(canApproveQuestion('admin')).toBe(true)
	})

	it('returns true for editor', () => {
		expect(canApproveQuestion('editor')).toBe(true)
	})

	it('returns false for writer', () => {
		expect(canApproveQuestion('writer')).toBe(false)
	})

	it('returns false for viewer', () => {
		expect(canApproveQuestion('viewer')).toBe(false)
	})
})

describe('canManageMembers', () => {
	it('returns true for owner', () => {
		expect(canManageMembers('owner')).toBe(true)
	})

	it('returns true for admin', () => {
		expect(canManageMembers('admin')).toBe(true)
	})

	it('returns false for editor', () => {
		expect(canManageMembers('editor')).toBe(false)
	})

	it('returns false for writer', () => {
		expect(canManageMembers('writer')).toBe(false)
	})

	it('returns false for viewer', () => {
		expect(canManageMembers('viewer')).toBe(false)
	})
})

describe('canManageBilling', () => {
	it('returns true for owner', () => {
		expect(canManageBilling('owner')).toBe(true)
	})

	it('returns false for admin', () => {
		expect(canManageBilling('admin')).toBe(false)
	})

	it('returns false for editor', () => {
		expect(canManageBilling('editor')).toBe(false)
	})

	it('returns false for writer', () => {
		expect(canManageBilling('writer')).toBe(false)
	})

	it('returns false for viewer', () => {
		expect(canManageBilling('viewer')).toBe(false)
	})
})

describe('canDeleteOrganization', () => {
	it('returns true for owner', () => {
		expect(canDeleteOrganization('owner')).toBe(true)
	})

	it('returns false for admin', () => {
		expect(canDeleteOrganization('admin')).toBe(false)
	})

	it('returns false for editor', () => {
		expect(canDeleteOrganization('editor')).toBe(false)
	})

	it('returns false for writer', () => {
		expect(canDeleteOrganization('writer')).toBe(false)
	})

	it('returns false for viewer', () => {
		expect(canDeleteOrganization('viewer')).toBe(false)
	})
})

describe('InsufficientRoleError', () => {
	it('creates error with correct message when user is not a member', () => {
		const error = new InsufficientRoleError('admin', null)

		expect(error.name).toBe('InsufficientRoleError')
		expect(error.message).toBe('User is not a member of this organization')
		expect(error.requiredRole).toBe('admin')
		expect(error.actualRole).toBeNull()
	})

	it('creates error with correct message when role is insufficient', () => {
		const error = new InsufficientRoleError('admin', 'viewer')

		expect(error.name).toBe('InsufficientRoleError')
		expect(error.message).toBe('Insufficient role: requires admin, has viewer')
		expect(error.requiredRole).toBe('admin')
		expect(error.actualRole).toBe('viewer')
	})
})
