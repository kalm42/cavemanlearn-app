import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
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
