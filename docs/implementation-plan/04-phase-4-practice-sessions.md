# Phase 4: Practice Sessions and Performance Tracking

> **See [00-overview.md](./00-overview.md) for project overview, codebase state, and quality requirements.**


**Goal**: Enable learners to practice with subscribed decks and track performance.

**Coverage Target**: Maintain 70% minimum.

---

## Phase 4.1: Recharts Installation

**Goal**: Install charting library for analytics visualizations.

### Tasks

1. **Install Recharts package**
   - Run `pnpm add recharts`
   - Verify installation in package.json

2. **Create chart theme configuration**
   - Create `/src/lib/chart-theme.ts`
   - Define consistent colors for charts
   - Define responsive breakpoints for chart sizing

### Files to Create/Modify

- `/src/lib/chart-theme.ts` (create)

### Dependencies

```bash
pnpm add recharts
```

### Testing

- Unit test: Chart theme exports correct colors

---

## Phase 4.2: Database Schema - Practice Sessions

**Goal**: Create table for tracking practice session configurations.

### Database Schema

```typescript
export const practiceSessions = pgTable("practice_sessions", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => userProfiles.id)
    .notNull(),
  deckId: uuid("deck_id")
    .references(() => decks.id)
    .notNull(),
  mode: text({ enum: ["immediate_feedback", "exam_simulation"] }).notNull(),
  timedMode: boolean("timed_mode").notNull().default(false),
  totalTimeSeconds: integer("total_time_seconds"),
  timePerQuestionSeconds: integer("time_per_question_seconds"),
  questionCount: integer("question_count").notNull(),
  status: text({ enum: ["in_progress", "completed", "abandoned"] })
    .notNull()
    .default("in_progress"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Tasks

1. **Add practiceSessions table to schema**
   - Define table in `/src/db/schema.ts`
   - Support two modes: immediate_feedback and exam_simulation
   - Track timing configuration

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `PracticeSession`, `NewPracticeSession` types
   - Export `PracticeMode`, `SessionStatus` enum types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types are correct
- Unit test: Verify mode enum values
- Unit test: Verify status enum values

---

## Phase 4.3: Database Schema - Session Topics

**Goal**: Create junction table for tracking which topics are included in a session.

### Database Schema

```typescript
export const sessionTopics = pgTable("session_topics", {
  id: uuid().primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .references(() => practiceSessions.id, { onDelete: "cascade" })
    .notNull(),
  topicId: uuid("topic_id")
    .references(() => topics.id)
    .notNull(),
});
```

### Tasks

1. **Add sessionTopics table to schema**
   - Define table in `/src/db/schema.ts`
   - Cascade delete when session is deleted

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `SessionTopic`, `NewSessionTopic` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify cascade delete behavior

---

## Phase 4.4: Database Schema - Session Questions

**Goal**: Create table for storing the ordered list of questions in a session.

### Database Schema

```typescript
export const sessionQuestions = pgTable("session_questions", {
  id: uuid().primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .references(() => practiceSessions.id, { onDelete: "cascade" })
    .notNull(),
  questionId: uuid("question_id")
    .references(() => questions.id)
    .notNull(),
  sortOrder: integer("sort_order").notNull(),
});
```

### Tasks

1. **Add sessionQuestions table to schema**
   - Define table in `/src/db/schema.ts`
   - Track question order within session

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `SessionQuestion`, `NewSessionQuestion` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify cascade delete from session

---

## Phase 4.5: Database Schema - Question Attempts

**Goal**: Create table for recording individual question answers.

### Database Schema

```typescript
export const questionAttempts = pgTable("question_attempts", {
  id: uuid().primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .references(() => practiceSessions.id, { onDelete: "cascade" })
    .notNull(),
  questionId: uuid("question_id")
    .references(() => questions.id)
    .notNull(),
  selectedOptionIds: jsonb("selected_option_ids").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  invalidated: boolean().notNull().default(false),
  timeSpentSeconds: integer("time_spent_seconds"),
  attemptedAt: timestamp("attempted_at").defaultNow(),
});
```

### Tasks

1. **Add questionAttempts table to schema**
   - Define table in `/src/db/schema.ts`
   - Store selected answers as JSONB array
   - Track correctness and time spent

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `QuestionAttempt`, `NewQuestionAttempt` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify JSONB stores array of UUIDs

---

## Phase 4.6: Database Schema - Topic Performance

**Goal**: Create table for aggregated performance statistics by topic.

### Database Schema

```typescript
export const topicPerformance = pgTable(
  "topic_performance",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => userProfiles.id)
      .notNull(),
    topicId: uuid("topic_id")
      .references(() => topics.id)
      .notNull(),
    totalAttempts: integer("total_attempts").notNull().default(0),
    correctAttempts: integer("correct_attempts").notNull().default(0),
    lastAttemptedAt: timestamp("last_attempted_at"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueUserTopic: unique().on(table.userId, table.topicId),
  }),
);
```

### Tasks

1. **Add topicPerformance table to schema**
   - Define table in `/src/db/schema.ts`
   - Unique constraint on user + topic
   - Track cumulative statistics

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `TopicPerformance`, `NewTopicPerformance` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify unique constraint on userId + topicId

---

## Phase 4.7: Database Schema - Daily Performance

**Goal**: Create table for daily performance summaries.

### Database Schema

```typescript
export const dailyPerformance = pgTable(
  "daily_performance",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => userProfiles.id)
      .notNull(),
    deckId: uuid("deck_id")
      .references(() => decks.id)
      .notNull(),
    date: date().notNull(),
    totalAttempts: integer("total_attempts").notNull().default(0),
    correctAttempts: integer("correct_attempts").notNull().default(0),
  },
  (table) => ({
    uniqueUserDeckDate: unique().on(table.userId, table.deckId, table.date),
  }),
);
```

### Tasks

1. **Add dailyPerformance table to schema**
   - Define table in `/src/db/schema.ts`
   - Unique constraint on user + deck + date
   - Enable time-series performance tracking

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `DailyPerformance`, `NewDailyPerformance` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify unique constraint on userId + deckId + date

---

## Phase 4.8: Answer Correctness Logic

**Goal**: Create utility functions for evaluating answer correctness.

### Tasks

1. **Create answer evaluation module**
   - Create `/src/lib/practice/answer-check.ts`
   - `checkMultipleChoice(selectedId, correctId)` - Single correct answer
   - `checkMultipleSelect(selectedIds, correctIds)` - Multiple correct answers
   - `checkTrueFalse(selected, correct)` - True/false questions

2. **Create scoring utilities**
   - Create `/src/lib/practice/scoring.ts`
   - `calculateSessionScore(attempts)` - Calculate percentage
   - `calculateTopicScores(attempts)` - Breakdown by topic

### Files to Create/Modify

- `/src/lib/practice/answer-check.ts` (create)
- `/src/lib/practice/scoring.ts` (create)

### Testing

- Unit test: Multiple choice returns true for correct answer
- Unit test: Multiple choice returns false for incorrect answer
- Unit test: Multiple select requires all correct options
- Unit test: Multiple select fails if extra option selected
- Unit test: Session score calculation is accurate
- Unit test: Topic scores group correctly

---

## Phase 4.9: Question Selection Algorithm

**Goal**: Create logic for selecting and randomizing session questions.

### Tasks

1. **Create question selection module**
   - Create `/src/lib/practice/question-selection.ts`
   - `selectQuestions(deckId, topicIds, count)` - Select random questions
   - Filter to approved questions only
   - Respect topic selection if provided
   - Randomize order

2. **Create weighted selection (optional)**
   - Prefer questions user hasn't seen recently
   - Prefer questions user got wrong previously
   - Balance across selected topics

### Files to Create/Modify

- `/src/lib/practice/question-selection.ts` (create)

### Testing

- Unit test: Returns requested number of questions
- Unit test: Only returns approved questions
- Unit test: Filters by selected topics
- Unit test: Randomizes order
- Unit test: Handles fewer questions than requested

---

## Phase 4.10: Start Practice Session API

**Goal**: API endpoint to create a new practice session.

### API Endpoints

| Endpoint              | Method | Purpose                     |
| --------------------- | ------ | --------------------------- |
| `/api/practice/start` | POST   | Create new practice session |

### Tasks

1. **Create POST /api/practice/start endpoint**
   - Create `/src/routes/api.practice.start.ts`
   - Require authentication
   - Verify user has active subscription to deck
   - Validate configuration (mode, questionCount, topics, timing)
   - Select questions using selection algorithm
   - Create session record
   - Create sessionTopics records
   - Create sessionQuestions records
   - Return session ID and first question

2. **Create validation schema**
   - Create `/src/lib/validation/practice.ts`
   - Define Zod schema for session configuration

### Files to Create/Modify

- `/src/routes/api.practice.start.ts` (create)
- `/src/lib/validation/practice.ts` (create)

### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 without subscription
- Unit test: Validates configuration
- Unit test: Creates session with correct config
- Unit test: Selects correct number of questions
- Unit test: Returns session ID

---

## Phase 4.11: Get Session Details API

**Goal**: API endpoint to retrieve session information.

### API Endpoints

| Endpoint                     | Method | Purpose             |
| ---------------------------- | ------ | ------------------- |
| `/api/practice/:sessionId` | GET    | Get session details |

### Tasks

1. **Create GET /api/practice/:sessionId endpoint**
   - Create `/src/routes/api.practice.$sessionId.ts`
   - Require authentication
   - Verify session belongs to current user
   - Return session configuration
   - Return progress (questions answered / total)
   - Return time elapsed (if timed)
   - Return current status

### Files to Create/Modify

- `/src/routes/api.practice.$sessionId.ts` (create)

### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for other user's session
- Unit test: Returns 404 for non-existent session
- Unit test: Returns session details
- Unit test: Calculates progress correctly

---

## Phase 4.12: Get Session Questions API

**Goal**: API endpoint to retrieve questions for a session.

### API Endpoints

| Endpoint                               | Method | Purpose               |
| -------------------------------------- | ------ | --------------------- |
| `/api/practice/:sessionId/questions` | GET    | Get session questions |

### Tasks

1. **Create GET /api/practice/:sessionId/questions endpoint**
   - Create `/src/routes/api.practice.$sessionId.questions.ts`
   - Require authentication
   - Verify session belongs to current user
   - Return questions in order
   - Include question content and answer options
   - Do NOT include correct answers (client determines)
   - Support pagination for large sessions
   - Indicate which questions are already answered

### Files to Create/Modify

- `/src/routes/api.practice.$sessionId.questions.ts` (create)

### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for other user's session
- Unit test: Returns questions in order
- Unit test: Does not expose correct answers
- Unit test: Indicates answered questions

---

## Phase 4.13: Submit Answer API

**Goal**: API endpoint to submit an answer for a question.

### API Endpoints

| Endpoint                            | Method | Purpose         |
| ----------------------------------- | ------ | --------------- |
| `/api/practice/:sessionId/submit` | POST   | Submit answer   |

### Tasks

1. **Create POST /api/practice/:sessionId/submit endpoint**
   - Create `/src/routes/api.practice.$sessionId.submit.ts`
   - Require authentication
   - Verify session belongs to current user
   - Verify session is in_progress
   - Validate question belongs to session
   - Validate selected options exist for question
   - Check answer correctness
   - Create questionAttempt record
   - Update topicPerformance aggregate
   - Update dailyPerformance aggregate
   - For immediate_feedback mode: return correctness and explanation
   - For exam_simulation mode: return only confirmation

2. **Create performance update helpers**
   - Create `/src/lib/practice/performance-update.ts`
   - `updateTopicPerformance(userId, topicId, isCorrect)`
   - `updateDailyPerformance(userId, deckId, isCorrect)`

### Files to Create/Modify

- `/src/routes/api.practice.$sessionId.submit.ts` (create)
- `/src/lib/practice/performance-update.ts` (create)

### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for other user's session
- Unit test: Returns 400 for invalid question
- Unit test: Returns 400 for completed session
- Unit test: Creates attempt record
- Unit test: Returns feedback in immediate mode
- Unit test: Returns only confirmation in exam mode
- Unit test: Updates topic performance
- Unit test: Updates daily performance

---

## Phase 4.14: Complete Session API

**Goal**: API endpoint to mark a session as completed.

### API Endpoints

| Endpoint                              | Method | Purpose          |
| ------------------------------------- | ------ | ---------------- |
| `/api/practice/:sessionId/complete` | POST   | Complete session |

### Tasks

1. **Create POST /api/practice/:sessionId/complete endpoint**
   - Create `/src/routes/api.practice.$sessionId.complete.ts`
   - Require authentication
   - Verify session belongs to current user
   - Verify session is in_progress
   - Set status to completed
   - Set completedAt timestamp
   - Return session summary

2. **Add abandon endpoint**
   - POST /api/practice/:sessionId/abandon
   - Set status to abandoned
   - Called when user exits without finishing

### Files to Create/Modify

- `/src/routes/api.practice.$sessionId.complete.ts` (create)

### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for other user's session
- Unit test: Returns 400 if already completed
- Unit test: Sets status to completed
- Unit test: Sets completedAt timestamp
- Unit test: Abandon sets status to abandoned

---

## Phase 4.15: Session Results API

**Goal**: API endpoint to retrieve detailed session results.

### API Endpoints

| Endpoint                             | Method | Purpose             |
| ------------------------------------ | ------ | ------------------- |
| `/api/practice/:sessionId/results` | GET    | Get session results |

### Tasks

1. **Create GET /api/practice/:sessionId/results endpoint**
   - Create `/src/routes/api.practice.$sessionId.results.ts`
   - Require authentication
   - Verify session belongs to current user
   - Session must be completed or abandoned
   - Return overall score
   - Return score breakdown by topic
   - Return time statistics
   - Return each question with:
     - Question content
     - User's answer
     - Correct answer
     - Whether user was correct
     - Explanation

### Files to Create/Modify

- `/src/routes/api.practice.$sessionId.results.ts` (create)

### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for other user's session
- Unit test: Returns 400 if session in_progress
- Unit test: Returns overall score
- Unit test: Returns topic breakdown
- Unit test: Returns question details with answers

---

## Phase 4.16: Analytics Overview API

**Goal**: API endpoint for user's overall performance summary.

### API Endpoints

| Endpoint                 | Method | Purpose                   |
| ------------------------ | ------ | ------------------------- |
| `/api/analytics/overview` | GET    | User performance overview |

### Tasks

1. **Create GET /api/analytics/overview endpoint**
   - Create `/src/routes/api.analytics.overview.ts`
   - Require authentication
   - Return total sessions completed
   - Return total questions answered
   - Return overall accuracy percentage
   - Return current streak (consecutive days)
   - Return best streak
   - Return performance by deck (subscribed decks only)

2. **Create streak calculation helper**
   - Create `/src/lib/analytics/streaks.ts`
   - `calculateCurrentStreak(userId)` - Days in a row with practice
   - `calculateBestStreak(userId)` - Longest streak ever

### Files to Create/Modify

- `/src/routes/api.analytics.overview.ts` (create)
- `/src/lib/analytics/streaks.ts` (create)

### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns totals correctly
- Unit test: Calculates accuracy correctly
- Unit test: Current streak counts consecutive days
- Unit test: Streak resets after missed day

---

## Phase 4.17: Deck Analytics API

**Goal**: API endpoint for deck-specific performance analytics.

### API Endpoints

| Endpoint                        | Method | Purpose               |
| ------------------------------- | ------ | --------------------- |
| `/api/analytics/deck/:deckId` | GET    | Deck-specific analytics |

### Tasks

1. **Create GET /api/analytics/deck/:deckId endpoint**
   - Create `/src/routes/api.analytics.deck.$deckId.ts`
   - Require authentication
   - Verify user has subscription to deck
   - Return sessions completed for this deck
   - Return questions answered for this deck
   - Return accuracy for this deck
   - Return recent session history
   - Return improvement trend (last 7 days vs previous 7)

### Files to Create/Modify

- `/src/routes/api.analytics.deck.$deckId.ts` (create)

### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 without subscription
- Unit test: Returns deck-specific statistics
- Unit test: Calculates improvement trend

---

## Phase 4.18: Topic Analytics API

**Goal**: API endpoint for topic-level performance breakdown.

### API Endpoints

| Endpoint              | Method | Purpose         |
| --------------------- | ------ | --------------- |
| `/api/analytics/topics` | GET    | Topic breakdown |

### Tasks

1. **Create GET /api/analytics/topics endpoint**
   - Create `/src/routes/api.analytics.topics.ts`
   - Require authentication
   - Accept optional deckId filter
   - Return performance by topic
   - Include topic name, total attempts, accuracy
   - Sort by accuracy (weakest topics first)
   - Identify topics needing improvement

### Files to Create/Modify

- `/src/routes/api.analytics.topics.ts` (create)

### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns all topics when no deckId
- Unit test: Filters by deckId when provided
- Unit test: Sorts by accuracy ascending
- Unit test: Calculates accuracy per topic

---

## Phase 4.19: Performance Trends API

**Goal**: API endpoint for performance over time.

### API Endpoints

| Endpoint              | Method | Purpose              |
| --------------------- | ------ | -------------------- |
| `/api/analytics/trends` | GET    | Performance over time |

### Tasks

1. **Create GET /api/analytics/trends endpoint**
   - Create `/src/routes/api.analytics.trends.ts`
   - Require authentication
   - Accept date range (default: last 30 days)
   - Accept optional deckId filter
   - Return daily performance data
   - Include date, attempts, correct, accuracy
   - Fill in zero values for days without practice

### Files to Create/Modify

- `/src/routes/api.analytics.trends.ts` (create)

### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns data for date range
- Unit test: Fills zeros for missing days
- Unit test: Filters by deckId when provided
- Unit test: Respects date range parameters

---

## Phase 4.20: Anonymous Comparison API

**Goal**: API endpoint for comparing performance to other learners.

### API Endpoints

| Endpoint               | Method | Purpose                 |
| ---------------------- | ------ | ----------------------- |
| `/api/analytics/compare` | GET    | Anonymous comparison data |

### Tasks

1. **Create GET /api/analytics/compare endpoint**
   - Create `/src/routes/api.analytics.compare.ts`
   - Require authentication
   - Accept deckId parameter
   - Return user's percentile ranking
   - Return anonymous distribution data
   - NO individual user data (privacy)
   - Calculate based on all-time or recent period

2. **Create comparison calculation helper**
   - Create `/src/lib/analytics/comparison.ts`
   - `calculatePercentile(userId, deckId)` - User's ranking
   - `getDistribution(deckId)` - Anonymous score buckets

### Files to Create/Modify

- `/src/routes/api.analytics.compare.ts` (create)
- `/src/lib/analytics/comparison.ts` (create)

### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 without subscription
- Unit test: Returns percentile ranking
- Unit test: Returns distribution without user identification
- Unit test: Handles decks with few learners gracefully

---

## Phase 4.21: Practice UI - Deck Selection Page

**Goal**: Page for selecting which deck to practice.

### UI Routes

| Route               | Purpose               |
| ------------------- | --------------------- |
| `/learner/practice` | Select deck to practice |

### Tasks

1. **Create practice index page**
   - Create `/src/routes/learner/practice/index.tsx`
   - List all subscribed decks
   - Show deck card with practice button
   - Show recent session info per deck
   - Show accuracy badge per deck
   - Empty state if no subscriptions

### Files to Create/Modify

- `/src/routes/learner/practice/index.tsx` (create)

### Testing

- Unit test: Shows all subscribed decks
- Unit test: Shows accuracy for each deck
- Unit test: Empty state when no subscriptions
- E2E test: Navigate to deck practice

---

## Phase 4.22: Practice UI - Deck Practice Home

**Goal**: Landing page for practicing a specific deck.

### UI Routes

| Route                            | Purpose           |
| -------------------------------- | ----------------- |
| `/learner/practice/:deckId` | Deck practice home |

### Tasks

1. **Create deck practice home page**
   - Create `/src/routes/learner/practice/$deckId/index.tsx`
   - Verify subscription
   - Show deck title and stats
   - Quick start button (default config)
   - Custom session button (to config page)
   - Recent sessions list
   - Topic performance overview

### Files to Create/Modify

- `/src/routes/learner/practice/$deckId/index.tsx` (create)

### Testing

- Unit test: Shows deck info
- Unit test: Shows recent sessions
- Unit test: Quick start creates session
- E2E test: Start quick practice session

---

## Phase 4.23: Practice UI - Session Configuration

**Goal**: Page for configuring a custom practice session.

### UI Routes

| Route                                  | Purpose               |
| -------------------------------------- | --------------------- |
| `/learner/practice/:deckId/config` | Session configuration |

### Tasks

1. **Create session config page**
   - Create `/src/routes/learner/practice/$deckId/config.tsx`
   - Mode selector (immediate feedback / exam simulation)
   - Question count slider/input
   - Topic selector (multi-select)
   - Timing options (untimed, total time, per-question)
   - Start session button

2. **Create SessionConfigForm component**
   - Create `/src/components/practice/SessionConfigForm.tsx`
   - Reusable form with all configuration options
   - Validation for inputs
   - Preview of session configuration

3. **Create TopicSelector component**
   - Create `/src/components/practice/TopicSelector.tsx`
   - Checkbox list of all deck topics
   - "Select All" / "Deselect All" buttons
   - Show question count per topic

### Files to Create/Modify

- `/src/routes/learner/practice/$deckId/config.tsx` (create)
- `/src/components/practice/SessionConfigForm.tsx` (create)
- `/src/components/practice/TopicSelector.tsx` (create)

### Testing

- Unit test: Form validates configuration
- Unit test: Topic selector handles selection
- Unit test: Start button creates session
- E2E test: Configure and start custom session

---

## Phase 4.24: Practice UI - Timer Component

**Goal**: Countdown timer for timed practice sessions.

### Tasks

1. **Create Timer component**
   - Create `/src/components/practice/Timer.tsx`
   - Display remaining time
   - Visual warning when low (< 1 minute)
   - Critical warning when very low (< 10 seconds)
   - Pause/resume capability (for exam mode)
   - Callback when time expires

2. **Create timer hook**
   - Create `/src/hooks/useTimer.ts`
   - `useTimer(seconds, onExpire)` - Countdown timer
   - Return remaining time, pause, resume, reset

### Files to Create/Modify

- `/src/components/practice/Timer.tsx` (create)
- `/src/hooks/useTimer.ts` (create)

### Testing

- Unit test: Timer counts down correctly
- Unit test: Timer pauses and resumes
- Unit test: Timer calls onExpire when done
- Unit test: Timer shows warning states

---

## Phase 4.25: Practice UI - Progress Bar Component

**Goal**: Visual progress indicator for practice sessions.

### Tasks

1. **Create ProgressBar component**
   - Create `/src/components/practice/ProgressBar.tsx`
   - Show current question number / total
   - Visual bar indicating progress
   - Optional: show answered vs remaining
   - Animate on progress change

### Files to Create/Modify

- `/src/components/practice/ProgressBar.tsx` (create)

### Testing

- Unit test: Shows correct progress
- Unit test: Updates on question change
- Unit test: Shows 100% when complete

---

## Phase 4.26: Practice UI - Question Display Component

**Goal**: Component for rendering question content.

### Tasks

1. **Create QuestionDisplay component**
   - Create `/src/components/practice/QuestionDisplay.tsx`
   - Render TipTap JSON content
   - Display question type indicator
   - Display topic tag
   - Handle images and equations
   - Responsive layout

### Files to Create/Modify

- `/src/components/practice/QuestionDisplay.tsx` (create)

### Testing

- Unit test: Renders question content
- Unit test: Shows question type badge
- Unit test: Renders images correctly
- Unit test: Renders equations correctly

---

## Phase 4.27: Practice UI - Answer Selector Component

**Goal**: Component for selecting answer options.

### Tasks

1. **Create AnswerSelector component**
   - Create `/src/components/practice/AnswerSelector.tsx`
   - Render answer options as selectable cards
   - Single select for multiple_choice and true_false
   - Multi-select for multiple_select questions
   - Visual feedback on selection
   - Disabled state for submitted answers

2. **Create answer option rendering**
   - Render TipTap content for each option
   - Letter labels (A, B, C, D...)
   - Checkbox/radio visual based on type

### Files to Create/Modify

- `/src/components/practice/AnswerSelector.tsx` (create)

### Testing

- Unit test: Renders all options
- Unit test: Single select allows one selection
- Unit test: Multi-select allows multiple selections
- Unit test: Disabled state prevents selection

---

## Phase 4.28: Practice UI - Immediate Feedback Component

**Goal**: Component showing feedback after answering in immediate mode.

### Tasks

1. **Create ImmediateFeedback component**
   - Create `/src/components/practice/ImmediateFeedback.tsx`
   - Show correct/incorrect indicator
   - Highlight correct answer(s)
   - Show user's selected answer(s)
   - Display explanation
   - "Next Question" button

### Files to Create/Modify

- `/src/components/practice/ImmediateFeedback.tsx` (create)

### Testing

- Unit test: Shows correct indicator when correct
- Unit test: Shows incorrect indicator when wrong
- Unit test: Highlights correct answers
- Unit test: Displays explanation

---

## Phase 4.29: Practice UI - Active Session Page

**Goal**: Main page for taking a practice session.

### UI Routes

| Route                                                     | Purpose        |
| --------------------------------------------------------- | -------------- |
| `/learner/practice/:deckId/session/:sessionId` | Active session |

### Tasks

1. **Create active session page**
   - Create `/src/routes/learner/practice/$deckId/session/$sessionId.tsx`
   - Load session and questions
   - Display progress bar
   - Display timer (if timed)
   - Display current question
   - Display answer selector
   - Submit answer button
   - Handle immediate feedback mode
   - Handle exam simulation mode
   - Navigation between questions (exam mode)
   - Complete session button

2. **Create session state management**
   - Track current question index
   - Track answered questions
   - Handle time expiration
   - Handle session completion

### Files to Create/Modify

- `/src/routes/learner/practice/$deckId/session/$sessionId.tsx` (create)

### Testing

- Unit test: Loads session correctly
- Unit test: Displays current question
- Unit test: Submits answer correctly
- Unit test: Shows feedback in immediate mode
- Unit test: Navigates in exam mode
- E2E test: Complete practice session

---

## Phase 4.30: Practice UI - Session Results Page

**Goal**: Page showing detailed results after completing a session.

### UI Routes

| Route                                                              | Purpose |
| ------------------------------------------------------------------ | ------- |
| `/learner/practice/:deckId/session/:sessionId/results` | Results |

### Tasks

1. **Create results page**
   - Create `/src/routes/learner/practice/$deckId/session/$sessionId/results.tsx`
   - Overall score display (percentage, fraction)
   - Time taken display
   - Score by topic breakdown
   - Question-by-question review
   - "Practice Again" button
   - "Back to Deck" button

2. **Create SessionResults component**
   - Create `/src/components/practice/SessionResults.tsx`
   - Score circle/gauge visualization
   - Confetti animation for high scores
   - Summary statistics

3. **Create QuestionReview component**
   - Create `/src/components/practice/QuestionReview.tsx`
   - Expandable question list
   - Show user answer vs correct answer
   - Filter to incorrect only option
   - Show explanation

### Files to Create/Modify

- `/src/routes/learner/practice/$deckId/session/$sessionId/results.tsx` (create)
- `/src/components/practice/SessionResults.tsx` (create)
- `/src/components/practice/QuestionReview.tsx` (create)

### Testing

- Unit test: Shows overall score
- Unit test: Shows topic breakdown
- Unit test: Question review shows details
- Unit test: Filter incorrect works
- E2E test: View session results

---

## Phase 4.31: Analytics UI - Performance Dashboard

**Goal**: Main analytics dashboard for learners.

### UI Routes

| Route                | Purpose             |
| -------------------- | ------------------- |
| `/learner/analytics` | Performance dashboard |

### Tasks

1. **Create analytics dashboard page**
   - Create `/src/routes/learner/analytics/index.tsx`
   - Overall statistics summary
   - Current streak display
   - Performance trend chart
   - Deck-by-deck breakdown
   - Weak topics highlight
   - Link to detailed deck analytics

2. **Create PerformanceOverview component**
   - Create `/src/components/analytics/PerformanceOverview.tsx`
   - Total sessions, questions, accuracy
   - Visual cards layout

3. **Create StreakCounter component**
   - Create `/src/components/analytics/StreakCounter.tsx`
   - Current streak with fire icon
   - Best streak display
   - Calendar heatmap (optional)

### Files to Create/Modify

- `/src/routes/learner/analytics/index.tsx` (create)
- `/src/components/analytics/PerformanceOverview.tsx` (create)
- `/src/components/analytics/StreakCounter.tsx` (create)

### Testing

- Unit test: Shows overall statistics
- Unit test: Shows current streak
- Unit test: Shows deck breakdown
- E2E test: View analytics dashboard

---

## Phase 4.32: Analytics UI - Trend Chart Component

**Goal**: Chart component showing performance over time.

### Tasks

1. **Create TrendChart component**
   - Create `/src/components/analytics/TrendChart.tsx`
   - Line chart using Recharts
   - Show accuracy over time
   - Show attempts over time
   - Date range selector
   - Responsive sizing
   - Tooltip with details

### Files to Create/Modify

- `/src/components/analytics/TrendChart.tsx` (create)

### Testing

- Unit test: Renders chart with data
- Unit test: Shows tooltip on hover
- Unit test: Handles empty data gracefully
- Unit test: Updates on date range change

---

## Phase 4.33: Analytics UI - Topic Breakdown Component

**Goal**: Component showing performance by topic.

### Tasks

1. **Create TopicBreakdown component**
   - Create `/src/components/analytics/TopicBreakdown.tsx`
   - Bar chart or table of topics
   - Show accuracy per topic
   - Color code by performance (red/yellow/green)
   - Sort by accuracy
   - Highlight weak areas

2. **Create AccuracyBadge component**
   - Create `/src/components/analytics/AccuracyBadge.tsx`
   - Color-coded accuracy display
   - Red: < 50%
   - Yellow: 50-75%
   - Green: > 75%

### Files to Create/Modify

- `/src/components/analytics/TopicBreakdown.tsx` (create)
- `/src/components/analytics/AccuracyBadge.tsx` (create)

### Testing

- Unit test: Shows all topics
- Unit test: Sorts by accuracy
- Unit test: AccuracyBadge shows correct color
- Unit test: Highlights weak topics

---

## Phase 4.34: Analytics UI - Deck Analytics Page

**Goal**: Detailed analytics page for a specific deck.

### UI Routes

| Route                          | Purpose        |
| ------------------------------ | -------------- |
| `/learner/analytics/:deckId` | Deck analytics |

### Tasks

1. **Create deck analytics page**
   - Create `/src/routes/learner/analytics/$deckId.tsx`
   - Deck-specific performance summary
   - Trend chart for this deck
   - Topic breakdown for this deck
   - Comparison to other learners (percentile)
   - Session history
   - Practice recommendation

2. **Create ComparisonChart component**
   - Create `/src/components/analytics/ComparisonChart.tsx`
   - Show user's position vs distribution
   - Histogram or similar visualization
   - "You're in the top X%" message

### Files to Create/Modify

- `/src/routes/learner/analytics/$deckId.tsx` (create)
- `/src/components/analytics/ComparisonChart.tsx` (create)

### Testing

- Unit test: Shows deck-specific stats
- Unit test: Shows comparison percentile
- Unit test: Shows session history
- E2E test: View deck analytics

---

## Phase 4.35: Session Recovery

**Goal**: Handle interrupted sessions and browser refresh.

### Tasks

1. **Create session recovery check**
   - Add to deck practice home page
   - Check for in_progress sessions
   - Prompt user to resume or abandon

2. **Create session state persistence**
   - Store current question index in localStorage
   - Store answer selections before submit
   - Restore on page reload

3. **Add session timeout handling**
   - Auto-abandon sessions after 24 hours
   - Background job or on-access check

### Files to Create/Modify

- `/src/routes/learner/practice/$deckId/index.tsx` (modify)
- `/src/lib/practice/session-recovery.ts` (create)

### Testing

- Unit test: Detects in_progress sessions
- Unit test: Restores from localStorage
- Unit test: Auto-abandons old sessions
- E2E test: Refresh during session and resume

---

