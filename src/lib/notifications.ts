import type { Notification, NotificationType } from '@/db/schema.ts'
import { db } from '@/db/index.ts'
import { notifications } from '@/db/schema.ts'
import { insertNotificationSchema, notificationSchema } from '@/db/validators.ts'

type CreateNotificationArgs = {
	userId: string
	type: NotificationType
	title: string
	message: string
	relatedQuestionId?: string | null
	relatedDeckId?: string | null
}

/**
 * ## createNotification
 *
 * Creates a new notification record in the database for a user. Validates input
 * with Zod schema and returns the validated notification record. Used by other
 * server-side code to send notifications to users.
 *
 * @example
 * const notification = await createNotification({
 *   userId: 'user-uuid',
 *   type: 'question_submitted_for_review',
 *   title: 'New Question Submitted',
 *   message: 'Your question has been submitted for review.',
 * })
 */
export async function createNotification(args: CreateNotificationArgs): Promise<Notification> {
	const { userId, type, title, message, relatedQuestionId, relatedDeckId } = args

	const insertData = insertNotificationSchema.parse({
		userId,
		type,
		title,
		message,
		relatedQuestionId: relatedQuestionId ?? null,
		relatedDeckId: relatedDeckId ?? null,
	})

	const [notification] = await db.insert(notifications).values(insertData).returning()

	return notificationSchema.parse(notification)
}

type NotifyQuestionSubmittedArgs = {
	userId: string
	questionId: string
	questionTitle: string
}

/**
 * ## notifyQuestionSubmitted
 *
 * Creates a notification for when a question is submitted for review.
 * Convenience wrapper around createNotification for this specific use case.
 *
 * @example
 * await notifyQuestionSubmitted({
 *   userId: 'reviewer-uuid',
 *   questionId: 'question-uuid',
 *   questionTitle: 'What is React?',
 * })
 */
export async function notifyQuestionSubmitted(
	args: NotifyQuestionSubmittedArgs,
): Promise<Notification> {
	const { userId, questionId, questionTitle } = args

	return createNotification({
		userId,
		type: 'question_submitted_for_review',
		title: 'Question Submitted for Review',
		message: `A new question "${questionTitle}" has been submitted and is awaiting review.`,
		relatedQuestionId: questionId,
	})
}

type NotifyCommentAddedArgs = {
	userId: string
	questionId: string
	questionTitle: string
	commenterName: string
}

/**
 * ## notifyCommentAdded
 *
 * Creates a notification for when a comment is added to a question.
 * Convenience wrapper around createNotification for this specific use case.
 *
 * @example
 * await notifyCommentAdded({
 *   userId: 'question-author-uuid',
 *   questionId: 'question-uuid',
 *   questionTitle: 'What is React?',
 *   commenterName: 'John Doe',
 * })
 */
export async function notifyCommentAdded(args: NotifyCommentAddedArgs): Promise<Notification> {
	const { userId, questionId, questionTitle, commenterName } = args

	return createNotification({
		userId,
		type: 'question_comment_added',
		title: 'New Comment on Question',
		message: `${commenterName} commented on your question "${questionTitle}".`,
		relatedQuestionId: questionId,
	})
}

type NotifyRevisionRequestedArgs = {
	userId: string
	questionId: string
	questionTitle: string
}

/**
 * ## notifyRevisionRequested
 *
 * Creates a notification for when a revision is requested on a question.
 * Convenience wrapper around createNotification for this specific use case.
 *
 * @example
 * await notifyRevisionRequested({
 *   userId: 'question-author-uuid',
 *   questionId: 'question-uuid',
 *   questionTitle: 'What is React?',
 * })
 */
export async function notifyRevisionRequested(
	args: NotifyRevisionRequestedArgs,
): Promise<Notification> {
	const { userId, questionId, questionTitle } = args

	return createNotification({
		userId,
		type: 'question_revision_requested',
		title: 'Revision Requested',
		message: `A revision has been requested for your question "${questionTitle}".`,
		relatedQuestionId: questionId,
	})
}
