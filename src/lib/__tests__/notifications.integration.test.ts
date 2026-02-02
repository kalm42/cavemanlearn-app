import { beforeEach, describe, expect, it, vi } from 'vitest'

import { eq } from 'drizzle-orm'

import { createNotification } from '../notifications'
import { decks, notifications, questions, userProfiles } from '@/db/schema.ts'

/**
 * ## createNotification - Integration
 *
 * Integration tests for the createNotification helper function.
 */
describe('createNotification', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('creates notification with all required fields', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_create_notif_required',
				email: 'create-notif-required@example.com',
				userType: 'publisher',
			})
			.returning()

		// Act
		const notification = await createNotification({
			userId: user.id,
			type: 'question_submitted_for_review',
			title: 'Test Notification',
			message: 'This is a test notification',
		})

		// Assert
		expect(notification.id).toBeTruthy()
		expect(notification.userId).toBe(user.id)
		expect(notification.type).toBe('question_submitted_for_review')
		expect(notification.title).toBe('Test Notification')
		expect(notification.message).toBe('This is a test notification')
		expect(notification.read).toBe(false)
		expect(notification.relatedQuestionId).toBeNull()
		expect(notification.relatedDeckId).toBeNull()
		expect(notification.createdAt).toBeInstanceOf(Date)
	})

	it('creates notification with optional relatedQuestionId', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_create_notif_question',
				email: 'create-notif-question@example.com',
				userType: 'publisher',
			})
			.returning()

		// Create a stub question for the foreign key relationship
		const [question] = await globalThis.testDb.insert(questions).values({}).returning()

		// Act
		const notification = await createNotification({
			userId: user.id,
			type: 'question_comment_added',
			title: 'Comment Added',
			message: 'A comment was added to your question',
			relatedQuestionId: question.id,
		})

		// Assert
		expect(notification.relatedQuestionId).toBe(question.id)
		expect(notification.relatedDeckId).toBeNull()
	})

	it('creates notification with optional relatedDeckId', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_create_notif_deck',
				email: 'create-notif-deck@example.com',
				userType: 'publisher',
			})
			.returning()

		// Create a stub deck for the foreign key relationship
		const [deck] = await globalThis.testDb.insert(decks).values({}).returning()

		// Act
		const notification = await createNotification({
			userId: user.id,
			type: 'deck_scheduled_published',
			title: 'Deck Published',
			message: 'Your scheduled deck has been published',
			relatedDeckId: deck.id,
		})

		// Assert
		expect(notification.relatedQuestionId).toBeNull()
		expect(notification.relatedDeckId).toBe(deck.id)
	})

	it('validates input with Zod schema', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_create_notif_validation',
				email: 'create-notif-validation@example.com',
				userType: 'publisher',
			})
			.returning()

		// Act & Assert - empty title should fail
		await expect(
			createNotification({
				userId: user.id,
				type: 'question_submitted_for_review',
				title: '',
				message: 'Valid message',
			}),
		).rejects.toThrow()
	})

	it('validates userId is a valid UUID', async () => {
		// Act & Assert - invalid UUID should fail
		await expect(
			createNotification({
				userId: 'not-a-uuid',
				type: 'question_submitted_for_review',
				title: 'Valid Title',
				message: 'Valid message',
			}),
		).rejects.toThrow()
	})

	it('persists notification to database', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'user_create_notif_persist',
				email: 'create-notif-persist@example.com',
				userType: 'publisher',
			})
			.returning()

		// Act
		const notification = await createNotification({
			userId: user.id,
			type: 'question_approved',
			title: 'Question Approved',
			message: 'Your question has been approved',
		})

		// Assert - verify it's in the database
		const [dbNotification] = await globalThis.testDb
			.select()
			.from(notifications)
			.where(eq(notifications.id, notification.id))

		expect(dbNotification).toBeDefined()
		expect(dbNotification.id).toBe(notification.id)
		expect(dbNotification.title).toBe('Question Approved')
	})
})
