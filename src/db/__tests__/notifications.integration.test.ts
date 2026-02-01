import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

import {
	NOTIFICATION_TYPES,
	notifications,
	questions,
	decks,
	userProfiles,
	type Notification,
	type NewNotification,
	type NotificationType,
} from '../schema'

/**
 * ## notifications
 *
 * Tests the notifications table in the database. This verifies that the database schema
 * is working as expected for notification-related functionality.
 */
describe('notifications', () => {
	it('creates a notification', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'clerk_notification_test',
				email: 'notification@example.com',
			})
			.returning()

		const newNotification: NewNotification = {
			userId: user.id,
			type: 'question_submitted_for_review',
			title: 'Question Submitted',
			message: 'A question has been submitted for review',
		}

		// Act
		const [inserted] = await globalThis.testDb
			.insert(notifications)
			.values(newNotification)
			.returning()

		// Assert
		expect(inserted).toMatchObject({
			userId: user.id,
			type: 'question_submitted_for_review',
			title: 'Question Submitted',
			message: 'A question has been submitted for review',
			read: false,
		})
		expect(inserted.id).toBeTruthy()
		expect(inserted.createdAt).toBeInstanceOf(Date)
		expect(inserted.relatedQuestionId).toBeNull()
		expect(inserted.relatedDeckId).toBeNull()
	})

	it('creates a notification with related question', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'clerk_notification_question',
				email: 'notification-question@example.com',
			})
			.returning()

		const [question] = await globalThis.testDb
			.insert(questions)
			.values({})
			.returning()

		const newNotification: NewNotification = {
			userId: user.id,
			type: 'question_approved',
			title: 'Question Approved',
			message: 'Your question has been approved',
			relatedQuestionId: question.id,
		}

		// Act
		const [inserted] = await globalThis.testDb
			.insert(notifications)
			.values(newNotification)
			.returning()

		// Assert
		expect(inserted).toMatchObject({
			userId: user.id,
			type: 'question_approved',
			title: 'Question Approved',
			message: 'Your question has been approved',
			relatedQuestionId: question.id,
			read: false,
		})
	})

	it('creates a notification with related deck', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'clerk_notification_deck',
				email: 'notification-deck@example.com',
			})
			.returning()

		const [deck] = await globalThis.testDb.insert(decks).values({}).returning()

		const newNotification: NewNotification = {
			userId: user.id,
			type: 'deck_scheduled_published',
			title: 'Deck Scheduled',
			message: 'Your deck has been scheduled for publication',
			relatedDeckId: deck.id,
		}

		// Act
		const [inserted] = await globalThis.testDb
			.insert(notifications)
			.values(newNotification)
			.returning()

		// Assert
		expect(inserted).toMatchObject({
			userId: user.id,
			type: 'deck_scheduled_published',
			title: 'Deck Scheduled',
			message: 'Your deck has been scheduled for publication',
			relatedDeckId: deck.id,
			read: false,
		})
	})

	it('reads notifications for a user', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'clerk_read_notifications',
				email: 'read-notifications@example.com',
			})
			.returning()

		await globalThis.testDb.insert(notifications).values({
			userId: user.id,
			type: 'question_submitted_for_review',
			title: 'Notification 1',
			message: 'First notification',
		})

		await globalThis.testDb.insert(notifications).values({
			userId: user.id,
			type: 'question_approved',
			title: 'Notification 2',
			message: 'Second notification',
		})

		// Act
		const results = await globalThis.testDb
			.select()
			.from(notifications)
			.where(eq(notifications.userId, user.id))

		// Assert
		expect(results).toHaveLength(2)
		expect(results[0].userId).toBe(user.id)
		expect(results[1].userId).toBe(user.id)
	})

	it('updates notification read status', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'clerk_update_notification',
				email: 'update-notification@example.com',
			})
			.returning()

		const [notification] = await globalThis.testDb
			.insert(notifications)
			.values({
				userId: user.id,
				type: 'question_comment_added',
				title: 'Comment Added',
				message: 'A comment was added to your question',
			})
			.returning()

		// Act
		const [updated] = await globalThis.testDb
			.update(notifications)
			.set({ read: true })
			.where(eq(notifications.id, notification.id))
			.returning()

		// Assert
		expect(updated.read).toBe(true)
	})

	it('cascades delete when user is deleted', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'clerk_cascade_notification',
				email: 'cascade-notification@example.com',
			})
			.returning()

		const [notification] = await globalThis.testDb
			.insert(notifications)
			.values({
				userId: user.id,
				type: 'question_revision_requested',
				title: 'Revision Requested',
				message: 'A revision has been requested',
			})
			.returning()

		// Act
		await globalThis.testDb.delete(userProfiles).where(eq(userProfiles.id, user.id))
		const results = await globalThis.testDb
			.select()
			.from(notifications)
			.where(eq(notifications.id, notification.id))

		// Assert
		expect(results).toHaveLength(0)
	})

	it('cascades delete when related question is deleted', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'clerk_cascade_question',
				email: 'cascade-question@example.com',
			})
			.returning()

		const [question] = await globalThis.testDb
			.insert(questions)
			.values({})
			.returning()

		const [notification] = await globalThis.testDb
			.insert(notifications)
			.values({
				userId: user.id,
				type: 'question_rejected',
				title: 'Question Rejected',
				message: 'Your question was rejected',
				relatedQuestionId: question.id,
			})
			.returning()

		// Act
		await globalThis.testDb.delete(questions).where(eq(questions.id, question.id))
		const results = await globalThis.testDb
			.select()
			.from(notifications)
			.where(eq(notifications.id, notification.id))

		// Assert
		expect(results).toHaveLength(0)
	})

	it('cascades delete when related deck is deleted', async () => {
		// Arrange
		const [user] = await globalThis.testDb
			.insert(userProfiles)
			.values({
				clerkId: 'clerk_cascade_deck',
				email: 'cascade-deck@example.com',
			})
			.returning()

		const [deck] = await globalThis.testDb.insert(decks).values({}).returning()

		const [notification] = await globalThis.testDb
			.insert(notifications)
			.values({
				userId: user.id,
				type: 'deck_scheduled_published',
				title: 'Deck Scheduled',
				message: 'Your deck has been scheduled',
				relatedDeckId: deck.id,
			})
			.returning()

		// Act
		await globalThis.testDb.delete(decks).where(eq(decks.id, deck.id))
		const results = await globalThis.testDb
			.select()
			.from(notifications)
			.where(eq(notifications.id, notification.id))

		// Assert
		expect(results).toHaveLength(0)
	})
})

describe('NOTIFICATION_TYPES', () => {
	it('contains all expected notification types', () => {
		// Assert
		expect(NOTIFICATION_TYPES).toEqual([
			'question_submitted_for_review',
			'question_comment_added',
			'question_revision_requested',
			'question_approved',
			'question_rejected',
			'deck_scheduled_published',
		])
	})

	it('has correct number of notification types', () => {
		// Assert
		expect(NOTIFICATION_TYPES).toHaveLength(6)
	})

	it('all notification types are valid NotificationType', () => {
		// Assert
		for (const type of NOTIFICATION_TYPES) {
			const notificationType: NotificationType = type
			expect(notificationType).toBe(type)
		}
	})
})

describe('Notification types', () => {
	it('Notification type is correctly inferred from schema', () => {
		// Arrange
		const notification: Notification = {
			id: '123e4567-e89b-12d3-a456-426614174000',
			userId: '223e4567-e89b-12d3-a456-426614174001',
			type: 'question_submitted_for_review',
			title: 'Test Notification',
			message: 'Test message',
			relatedQuestionId: null,
			relatedDeckId: null,
			read: false,
			createdAt: new Date(),
		}

		// Assert
		expect(notification.type).toBe('question_submitted_for_review')
		expect(notification.read).toBe(false)
	})

	it('NewNotification type allows all notification types', () => {
		// Assert
		for (const type of NOTIFICATION_TYPES) {
			const newNotification: NewNotification = {
				userId: '123e4567-e89b-12d3-a456-426614174000',
				type: type,
				title: 'Test',
				message: 'Test message',
			}
			expect(newNotification.type).toBe(type)
		}
	})
})
