import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

export const userProfiles = pgTable('user_profiles', {
	id: uuid().primaryKey().defaultRandom(),
	clerkId: text('clerk_id').notNull().unique(),
	email: text().notNull(),
	displayName: text('display_name'),
	avatarUrl: text('avatar_url'),
	userType: text('user_type', { enum: ['learner', 'publisher'] })
		.notNull()
		.default('learner'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
})

export type UserProfile = InferSelectModel<typeof userProfiles>
export type NewUserProfile = InferInsertModel<typeof userProfiles>
export type UserType = 'learner' | 'publisher'

export const organizations = pgTable('organizations', {
	id: uuid().primaryKey().defaultRandom(),
	name: text().notNull(),
	slug: text().notNull().unique(),
	description: text(),
	logoUrl: text('logo_url'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
})

export type Organization = InferSelectModel<typeof organizations>
export type NewOrganization = InferInsertModel<typeof organizations>

export const ORG_ROLES = ['owner', 'admin', 'editor', 'writer', 'viewer'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

export const organizationMembers = pgTable(
	'organization_members',
	{
		id: uuid().primaryKey().defaultRandom(),
		organizationId: uuid('organization_id')
			.references(() => organizations.id, { onDelete: 'cascade' })
			.notNull(),
		userId: uuid('user_id')
			.references(() => userProfiles.id, { onDelete: 'cascade' })
			.notNull(),
		role: text({ enum: ORG_ROLES }).notNull(),
		createdAt: timestamp('created_at').defaultNow(),
	},
	(table) => [unique().on(table.organizationId, table.userId)],
)

export type OrganizationMember = InferSelectModel<typeof organizationMembers>
export type NewOrganizationMember = InferInsertModel<typeof organizationMembers>
