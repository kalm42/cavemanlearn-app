import { boolean, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
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

// Stub tables for foreign key references (will be fully implemented in Phase 2)
export const questions = pgTable('questions', {
	id: uuid().primaryKey().defaultRandom(),
})

export const decks = pgTable('decks', {
	id: uuid().primaryKey().defaultRandom(),
})

export const NOTIFICATION_TYPES = [
	'question_submitted_for_review',
	'question_comment_added',
	'question_revision_requested',
	'question_approved',
	'question_rejected',
	'deck_scheduled_published',
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export const notifications = pgTable('notifications', {
	id: uuid().primaryKey().defaultRandom(),
	userId: uuid('user_id')
		.references(() => userProfiles.id, { onDelete: 'cascade' })
		.notNull(),
	type: text({ enum: NOTIFICATION_TYPES }).notNull(),
	title: text().notNull(),
	message: text().notNull(),
	relatedQuestionId: uuid('related_question_id').references(() => questions.id, {
		onDelete: 'cascade',
	}),
	relatedDeckId: uuid('related_deck_id').references(() => decks.id, {
		onDelete: 'cascade',
	}),
	read: boolean().notNull().default(false),
	createdAt: timestamp('created_at').defaultNow(),
})

export type Notification = InferSelectModel<typeof notifications>
export type NewNotification = InferInsertModel<typeof notifications>
