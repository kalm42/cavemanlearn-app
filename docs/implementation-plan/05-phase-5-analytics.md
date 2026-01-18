# Phase 5: Publisher Analytics and Question Reporting

> **See [00-overview.md](./00-overview.md) for project overview, codebase state, and quality requirements.**

**Goal**: Give publishers insights and handle learner feedback.

**Coverage Target**: Maintain 70% minimum.

---

## Phase 5.1: Database Schema - Question Reports

**Goal**: Create table for learner-submitted question reports.

### Database Schema

```typescript
export const questionReports = pgTable('question_reports', {
	id: uuid().primaryKey().defaultRandom(),
	questionId: uuid('question_id')
		.references(() => questions.id)
		.notNull(),
	reportedBy: uuid('reported_by')
		.references(() => userProfiles.id)
		.notNull(),
	reason: text({
		enum: ['incorrect_answer', 'unclear_question', 'typo', 'outdated', 'broken_media', 'other'],
	}).notNull(),
	details: text(),
	status: text({ enum: ['pending', 'reviewing', 'resolved', 'dismissed'] })
		.notNull()
		.default('pending'),
	resolution: text(),
	resolvedBy: uuid('resolved_by').references(() => userProfiles.id),
	resolvedAt: timestamp('resolved_at'),
	createdAt: timestamp('created_at').defaultNow(),
})
```

### Tasks

1. **Add questionReports table to schema**
   - Define table in `/src/db/schema.ts`
   - Track report reason with enum
   - Track resolution workflow

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `QuestionReport`, `NewQuestionReport` types
   - Export `ReportReason`, `ReportStatus` enum types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types are correct
- Unit test: Verify reason enum values
- Unit test: Verify status enum values

---

## Phase 5.2: Database Schema - Question Performance

**Goal**: Create table for aggregated question-level statistics.

### Database Schema

```typescript
export const questionPerformance = pgTable('question_performance', {
	id: uuid().primaryKey().defaultRandom(),
	questionId: uuid('question_id')
		.references(() => questions.id, { onDelete: 'cascade' })
		.notNull()
		.unique(),
	totalAttempts: integer('total_attempts').notNull().default(0),
	correctAttempts: integer('correct_attempts').notNull().default(0),
	avgTimeSeconds: integer('avg_time_seconds'),
	reportCount: integer('report_count').notNull().default(0),
	updatedAt: timestamp('updated_at').defaultNow(),
})
```

### Tasks

1. **Add questionPerformance table to schema**
   - Define table in `/src/db/schema.ts`
   - One-to-one with questions
   - Track aggregate statistics

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `QuestionPerformance`, `NewQuestionPerformance` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify unique constraint on questionId
- Unit test: Verify cascade delete

---

## Phase 5.3: Database Schema - Revenue Records

**Goal**: Create table for tracking revenue from subscriptions.

### Database Schema

```typescript
export const revenueRecords = pgTable('revenue_records', {
	id: uuid().primaryKey().defaultRandom(),
	organizationId: uuid('organization_id')
		.references(() => organizations.id)
		.notNull(),
	deckId: uuid('deck_id')
		.references(() => decks.id)
		.notNull(),
	subscriptionId: uuid('subscription_id')
		.references(() => subscriptions.id)
		.notNull(),
	stripeInvoiceId: text('stripe_invoice_id').notNull(),
	stripePaymentIntentId: text('stripe_payment_intent_id'),
	grossAmountCents: integer('gross_amount_cents').notNull(),
	platformFeeCents: integer('platform_fee_cents').notNull(), // 30%
	netAmountCents: integer('net_amount_cents').notNull(), // 70%
	periodStart: timestamp('period_start').notNull(),
	periodEnd: timestamp('period_end').notNull(),
	paidAt: timestamp('paid_at'),
	createdAt: timestamp('created_at').defaultNow(),
})
```

### Tasks

1. **Add revenueRecords table to schema**
   - Define table in `/src/db/schema.ts`
   - Store gross, platform fee (30%), and net (70%) amounts
   - Link to organization, deck, and subscription

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `RevenueRecord`, `NewRevenueRecord` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify all foreign key references

---

## Phase 5.4: Revenue Calculation Utilities

**Goal**: Create utility functions for revenue split calculations.

### Tasks

1. **Create revenue calculation module**
   - Create `/src/lib/revenue.ts`
   - `calculatePlatformFee(grossCents)` - Calculate 30% platform fee
   - `calculateNetRevenue(grossCents)` - Calculate 70% publisher share
   - `formatRevenue(cents)` - Format cents as currency string

2. **Create revenue aggregation helpers**
   - `aggregateRevenueByPeriod(records, period)` - Group by day/week/month
   - `calculateTotalRevenue(orgId, dateRange)` - Sum for organization

### Files to Create/Modify

- `/src/lib/revenue.ts` (create)

### Testing

- Unit test: Platform fee is exactly 30%
- Unit test: Net revenue is exactly 70%
- Unit test: Calculations handle edge cases (0, small amounts)
- Unit test: Aggregation groups correctly

---

## Phase 5.5: Update Question Performance on Answer

**Goal**: Update question performance statistics when learners answer.

### Tasks

1. **Create question performance update helper**
   - Create `/src/lib/publisher/question-stats.ts`
   - `updateQuestionPerformance(questionId, isCorrect, timeSpent)`
   - Create record if not exists (upsert)
   - Increment totalAttempts
   - Increment correctAttempts if correct
   - Update avgTimeSeconds (running average)

2. **Integrate with answer submission**
   - Modify `/src/routes/api.practice.$sessionId.submit.ts`
   - Call updateQuestionPerformance after recording attempt

### Files to Create/Modify

- `/src/lib/publisher/question-stats.ts` (create)
- `/src/routes/api.practice.$sessionId.submit.ts` (modify)

### Testing

- Integration test: Creates record on first attempt
- Integration test: Updates existing record correctly
- Integration test: Running average calculation is accurate
- Integration test: Concurrent updates are handled
- Integration test: Performance update on answer submission
- Integration test: Upsert creates record if not exists

---

## Phase 5.6: Create Revenue Record on Payment

**Goal**: Record revenue when subscription payments succeed.

### Tasks

1. **Create revenue recording helper**
   - Create `/src/lib/publisher/revenue-record.ts`
   - `recordRevenue(invoice, subscription)` - Create revenue record
   - Extract amounts from Stripe invoice
   - Calculate platform fee and net revenue
   - Link to correct organization and deck

2. **Update Stripe webhook handler**
   - Modify `/src/integrations/stripe/webhooks.ts`
   - Call recordRevenue in handleInvoicePaymentSucceeded
   - Set paidAt timestamp

### Files to Create/Modify

- `/src/lib/publisher/revenue-record.ts` (create)
- `/src/integrations/stripe/webhooks.ts` (modify)

### Testing

- Integration test: Revenue record created with correct amounts
- Integration test: 70/30 split is accurate
- Integration test: Links to correct organization
- Integration test: Handles various invoice scenarios
- Integration test: Revenue record created on invoice payment
- Integration test: Links to correct organization

---

## Phase 5.7: Submit Question Report API

**Goal**: API endpoint for learners to report question issues.

### API Endpoints

| Endpoint              | Method | Purpose                |
| --------------------- | ------ | ---------------------- |
| `/api/reports/submit` | POST   | Submit question report |

### Tasks

1. **Create POST /api/reports/submit endpoint**
   - Create `/src/routes/api.reports.submit.ts`
   - Require authentication
   - Verify user has subscription to question's deck
   - Validate report reason and details
   - Check for duplicate reports (same user, same question, pending)
   - Create report record
   - Increment reportCount on questionPerformance
   - Return created report

2. **Create validation schema**
   - Create `/src/lib/validation/report.ts`
   - Define Zod schema for report submission

### Files to Create/Modify

- `/src/routes/api.reports.submit.ts` (create)
- `/src/lib/validation/report.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 403 without subscription
- Integration test: Returns 400 for invalid reason
- Integration test: Returns 409 for duplicate pending report
- Integration test: Creates report successfully
- Integration test: Increments question report count
- Integration test: Report creation increments questionPerformance.reportCount
- Integration test: Duplicate report prevention
- Integration test: Subscription verification

---

## Phase 5.8: List Question Reports API

**Goal**: API endpoint for publishers to list reports for their questions.

### API Endpoints

| Endpoint                 | Method | Purpose               |
| ------------------------ | ------ | --------------------- |
| `/api/publisher/reports` | GET    | List question reports |

### Tasks

1. **Create GET /api/publisher/reports endpoint**
   - Create `/src/routes/api.publisher.reports.ts`
   - Require authentication
   - Require publisher user type
   - Accept orgId query parameter
   - Verify user has access to organization
   - Return reports for questions in org's decks
   - Support status filter (pending, reviewing, resolved, dismissed)
   - Support pagination
   - Order by createdAt (newest first)
   - Include question preview and deck info

### Files to Create/Modify

- `/src/routes/api.publisher.reports.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 403 for non-publishers
- Integration test: Returns 403 for non-members
- Integration test: Filters by status
- Integration test: Returns reports with question info
- Integration test: Pagination works correctly
- Integration test: Returns reports for org's decks

---

## Phase 5.9: View/Resolve Report API

**Goal**: API endpoints for viewing and resolving individual reports.

### API Endpoints

| Endpoint                           | Method | Purpose        |
| ---------------------------------- | ------ | -------------- |
| `/api/publisher/reports/:reportId` | GET    | View report    |
| `/api/publisher/reports/:reportId` | PUT    | Resolve report |

### Tasks

1. **Create GET /api/publisher/reports/:reportId endpoint**
   - Create `/src/routes/api.publisher.reports.$reportId.ts`
   - Require authentication
   - Verify user has access to report's question's deck's org
   - Return full report details
   - Include question content
   - Include reporter info (anonymized or name based on settings)

2. **Create PUT /api/publisher/reports/:reportId endpoint**
   - Verify user has editor+ role
   - Accept status and resolution fields
   - Valid transitions: pending→reviewing, reviewing→resolved/dismissed
   - Set resolvedBy and resolvedAt when resolved/dismissed
   - Return updated report

3. **Create validation schema**
   - Add to `/src/lib/validation/report.ts`
   - Define Zod schema for report resolution

### Files to Create/Modify

- `/src/routes/api.publisher.reports.$reportId.ts` (create)
- `/src/lib/validation/report.ts` (modify)

### Testing

- Integration test: GET returns 403 for non-members
- Integration test: GET returns full report details
- Integration test: PUT returns 403 for writers
- Integration test: PUT validates status transitions
- Integration test: PUT sets resolver info
- Integration test: PUT updates status correctly
- Integration test: Status transition validation
- Integration test: Sets resolvedBy and resolvedAt

---

## Phase 5.10: Publisher Analytics Overview API

**Goal**: API endpoint for publisher dashboard statistics.

### API Endpoints

| Endpoint                            | Method | Purpose                  |
| ----------------------------------- | ------ | ------------------------ |
| `/api/publisher/analytics/overview` | GET    | Publisher overview stats |

### Tasks

1. **Create GET /api/publisher/analytics/overview endpoint**
   - Create `/src/routes/api.publisher.analytics.overview.ts`
   - Require authentication
   - Require publisher user type
   - Accept orgId query parameter
   - Return total subscribers across all decks
   - Return total revenue (lifetime and period)
   - Return total questions published
   - Return total attempts on questions
   - Return average accuracy across all questions
   - Return pending reports count
   - Return deck-by-deck summary

### Files to Create/Modify

- `/src/routes/api.publisher.analytics.overview.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 403 for non-publishers
- Integration test: Returns correct totals
- Integration test: Returns deck breakdown
- Integration test: Handles org with no decks
- Integration test: Returns correct totals across all decks
- Integration test: Returns pending reports count

---

## Phase 5.11: Deck Performance Analytics API

**Goal**: API endpoint for deck-specific publisher analytics.

### API Endpoints

| Endpoint                           | Method | Purpose          |
| ---------------------------------- | ------ | ---------------- |
| `/api/publisher/analytics/:deckId` | GET    | Deck performance |

### Tasks

1. **Create GET /api/publisher/analytics/:deckId endpoint**
   - Create `/src/routes/api.publisher.analytics.$deckId.ts`
   - Require authentication
   - Verify user has access to deck's org
   - Return subscriber count (active, total)
   - Return revenue for this deck
   - Return total questions and approved count
   - Return total attempts
   - Return average accuracy
   - Return topic breakdown
   - Return pending reports for this deck

### Files to Create/Modify

- `/src/routes/api.publisher.analytics.$deckId.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 403 for non-members
- Integration test: Returns deck-specific stats
- Integration test: Returns topic breakdown
- Integration test: Returns pending reports count
- Integration test: Returns deck-specific subscriber count
- Integration test: Returns deck-specific revenue

---

## Phase 5.12: Question-Level Analytics API

**Goal**: API endpoint for question performance statistics.

### API Endpoints

| Endpoint                                     | Method | Purpose              |
| -------------------------------------------- | ------ | -------------------- |
| `/api/publisher/analytics/:deckId/questions` | GET    | Question-level stats |

### Tasks

1. **Create GET /api/publisher/analytics/:deckId/questions endpoint**
   - Create `/src/routes/api.publisher.analytics.$deckId.questions.ts`
   - Require authentication
   - Verify user has access to deck's org
   - Return list of questions with performance data
   - Include attempts, accuracy, avg time
   - Include report count
   - Support sorting (accuracy, attempts, reports)
   - Support pagination
   - Flag questions with low accuracy (< 30% or > 90%)
   - Flag questions with reports

### Files to Create/Modify

- `/src/routes/api.publisher.analytics.$deckId.questions.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 403 for non-members
- Integration test: Returns questions with stats
- Integration test: Sorting works correctly
- Integration test: Flags problematic questions

---

## Phase 5.13: Subscriber Trends API

**Goal**: API endpoint for subscriber growth analytics.

### API Endpoints

| Endpoint                                       | Method | Purpose           |
| ---------------------------------------------- | ------ | ----------------- |
| `/api/publisher/analytics/:deckId/subscribers` | GET    | Subscriber trends |

### Tasks

1. **Create GET /api/publisher/analytics/:deckId/subscribers endpoint**
   - Create `/src/routes/api.publisher.analytics.$deckId.subscribers.ts`
   - Require authentication
   - Verify user has access to deck's org
   - Return subscriber count over time
   - Return new subscribers by period (day/week/month)
   - Return churn rate (cancellations)
   - Return active vs total subscribers
   - Return breakdown by billing interval (monthly/yearly)

### Files to Create/Modify

- `/src/routes/api.publisher.analytics.$deckId.subscribers.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 403 for non-members
- Integration test: Returns subscriber trends
- Integration test: Calculates churn rate correctly
- Integration test: Returns billing interval breakdown
- Integration test: Returns subscriber count over time

---

## Phase 5.14: Revenue Summary API

**Goal**: API endpoint for revenue analytics.

### API Endpoints

| Endpoint                 | Method | Purpose         |
| ------------------------ | ------ | --------------- |
| `/api/publisher/revenue` | GET    | Revenue summary |

### Tasks

1. **Create GET /api/publisher/revenue endpoint**
   - Create `/src/routes/api.publisher.revenue.ts`
   - Require authentication
   - Require owner role in organization
   - Accept orgId and date range parameters
   - Return total gross revenue
   - Return total platform fees
   - Return total net revenue
   - Return revenue by deck
   - Return revenue by period (day/week/month)
   - Return pending payouts (from Stripe)

### Files to Create/Modify

- `/src/routes/api.publisher.revenue.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 403 for non-owners
- Integration test: Returns correct revenue totals
- Integration test: Returns deck breakdown
- Integration test: Respects date range filter

---

## Phase 5.15: Revenue Export API

**Goal**: API endpoint for exporting revenue data as CSV.

### API Endpoints

| Endpoint                        | Method | Purpose            |
| ------------------------------- | ------ | ------------------ |
| `/api/publisher/revenue/export` | GET    | Export revenue CSV |

### Tasks

1. **Create GET /api/publisher/revenue/export endpoint**
   - Create `/src/routes/api.publisher.revenue.export.ts`
   - Require authentication
   - Require owner role in organization
   - Accept orgId and date range parameters
   - Generate CSV with columns:
     - Date, Deck, Subscriber, Gross, Platform Fee, Net, Period
   - Return as downloadable CSV file
   - Set appropriate Content-Type and Content-Disposition headers

2. **Create CSV generation utility**
   - Create `/src/lib/csv.ts`
   - `generateCsv(headers, rows)` - Create CSV string
   - Handle escaping for special characters

### Files to Create/Modify

- `/src/routes/api.publisher.revenue.export.ts` (create)
- `/src/lib/csv.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 403 for non-owners
- Integration test: Generates valid CSV
- Integration test: CSV headers match expected format
- Integration test: Special characters are escaped

---

## Phase 5.16: Report Question Modal Component

**Goal**: Modal component for learners to report question issues.

### Tasks

1. **Create ReportQuestionModal component**
   - Create `/src/components/practice/ReportQuestionModal.tsx`
   - Trigger from practice session (flag icon)
   - Reason selector (radio buttons)
   - Details text area (optional)
   - Submit and cancel buttons
   - Loading state during submission
   - Success/error feedback

2. **Add report button to practice UI**
   - Modify question display component
   - Add flag/report icon button
   - Open modal on click

### Files to Create/Modify

- `/src/components/practice/ReportQuestionModal.tsx` (create)
- `/src/components/practice/QuestionDisplay.tsx` (modify)

### Testing

- Unit test: Modal renders with reason options
- Unit test: Submit calls API with correct data
- Unit test: Shows success message on completion
- Unit test: Shows error on failure
- E2E test: Report question during practice

---

## Phase 5.17: Publisher Dashboard Page

**Goal**: Main analytics dashboard for publishers.

### UI Routes

| Route                  | Purpose             |
| ---------------------- | ------------------- |
| `/publisher/analytics` | Publisher dashboard |

### Tasks

1. **Create publisher analytics dashboard**
   - Create `/src/routes/publisher/analytics/index.tsx`
   - Organization selector (if user has multiple)
   - Overview statistics cards
   - Revenue summary chart
   - Subscriber growth chart
   - Deck performance table
   - Pending reports alert
   - Links to detailed views

2. **Create DashboardStats component**
   - Create `/src/components/publisher/DashboardStats.tsx`
   - Total subscribers card
   - Total revenue card
   - Total questions card
   - Average accuracy card
   - Pending reports badge

### Files to Create/Modify

- `/src/routes/publisher/analytics/index.tsx` (create)
- `/src/components/publisher/DashboardStats.tsx` (create)

### Testing

- Unit test: Shows overview statistics
- Unit test: Shows deck breakdown
- Unit test: Pending reports badge appears
- E2E test: View publisher dashboard

---

## Phase 5.18: Deck Analytics Page

**Goal**: Detailed analytics page for a specific deck.

### UI Routes

| Route                          | Purpose        |
| ------------------------------ | -------------- |
| `/publisher/analytics/:deckId` | Deck analytics |

### Tasks

1. **Create deck analytics page**
   - Create `/src/routes/publisher/analytics/$deckId/index.tsx`
   - Deck overview stats
   - Subscriber chart over time
   - Revenue chart for this deck
   - Topic performance breakdown
   - Quick links to questions and subscribers tabs
   - Pending reports for this deck

2. **Create SubscriberChart component**
   - Create `/src/components/publisher/SubscriberChart.tsx`
   - Line chart showing subscriber count over time
   - Toggle between cumulative and new subscribers
   - Date range selector
   - Show churn rate

### Files to Create/Modify

- `/src/routes/publisher/analytics/$deckId/index.tsx` (create)
- `/src/components/publisher/SubscriberChart.tsx` (create)

### Testing

- Unit test: Shows deck-specific stats
- Unit test: Subscriber chart renders correctly
- Unit test: Date range filter works
- E2E test: View deck analytics

---

## Phase 5.19: Question Performance Page

**Goal**: Page showing performance statistics for each question.

### UI Routes

| Route                                    | Purpose              |
| ---------------------------------------- | -------------------- |
| `/publisher/analytics/:deckId/questions` | Question performance |

### Tasks

1. **Create question performance page**
   - Create `/src/routes/publisher/analytics/$deckId/questions.tsx`
   - Sortable/filterable table of questions
   - Show accuracy, attempts, avg time
   - Highlight problematic questions
   - Show report count with link
   - Filter by topic
   - Link to edit question

2. **Create QuestionPerformanceTable component**
   - Create `/src/components/publisher/QuestionPerformanceTable.tsx`
   - Sortable columns
   - Color-coded accuracy (red/yellow/green)
   - Report count badge
   - Expand to see question preview

### Files to Create/Modify

- `/src/routes/publisher/analytics/$deckId/questions.tsx` (create)
- `/src/components/publisher/QuestionPerformanceTable.tsx` (create)

### Testing

- Unit test: Table renders all questions
- Unit test: Sorting works correctly
- Unit test: Filtering by topic works
- Unit test: Problematic questions highlighted
- E2E test: View question performance

---

## Phase 5.20: Subscriber Analytics Page

**Goal**: Page showing detailed subscriber information.

### UI Routes

| Route                                      | Purpose              |
| ------------------------------------------ | -------------------- |
| `/publisher/analytics/:deckId/subscribers` | Subscriber analytics |

### Tasks

1. **Create subscriber analytics page**
   - Create `/src/routes/publisher/analytics/$deckId/subscribers.tsx`
   - Subscriber growth chart
   - New subscribers vs churned chart
   - Billing interval breakdown (pie chart)
   - Subscriber retention metrics
   - No individual subscriber data (privacy)

### Files to Create/Modify

- `/src/routes/publisher/analytics/$deckId/subscribers.tsx` (create)

### Testing

- Unit test: Shows subscriber metrics
- Unit test: Charts render correctly
- Unit test: No individual data exposed
- E2E test: View subscriber analytics

---

## Phase 5.21: Reports List Page

**Goal**: Page listing all question reports for publisher review.

### UI Routes

| Route                | Purpose      |
| -------------------- | ------------ |
| `/publisher/reports` | Reports list |

### Tasks

1. **Create reports list page**
   - Create `/src/routes/publisher/reports/index.tsx`
   - Organization selector
   - Filter by status (pending, reviewing, resolved, dismissed)
   - Filter by deck
   - Sortable table of reports
   - Show question preview, reason, date
   - Quick actions (start review, dismiss)
   - Link to full report detail

2. **Create ReportCard component**
   - Create `/src/components/publisher/ReportCard.tsx`
   - Question preview (truncated)
   - Reason badge
   - Status badge
   - Reporter info (anonymized)
   - Date submitted
   - Quick action buttons

### Files to Create/Modify

- `/src/routes/publisher/reports/index.tsx` (create)
- `/src/components/publisher/ReportCard.tsx` (create)

### Testing

- Unit test: Shows all reports
- Unit test: Filters by status
- Unit test: Quick actions work
- E2E test: View reports list

---

## Phase 5.22: Report Detail Page

**Goal**: Page showing full report details with resolution form.

### UI Routes

| Route                          | Purpose       |
| ------------------------------ | ------------- |
| `/publisher/reports/:reportId` | Report detail |

### Tasks

1. **Create report detail page**
   - Create `/src/routes/publisher/reports/$reportId.tsx`
   - Full question content
   - Report reason and details
   - Reporter info
   - Current status
   - Resolution form (if pending/reviewing)
   - Resolution history (if resolved)
   - Link to edit question

2. **Create ReportResolutionForm component**
   - Create `/src/components/publisher/ReportResolutionForm.tsx`
   - Status selector (reviewing, resolved, dismissed)
   - Resolution notes text area
   - Submit button
   - Validation for required fields

### Files to Create/Modify

- `/src/routes/publisher/reports/$reportId.tsx` (create)
- `/src/components/publisher/ReportResolutionForm.tsx` (create)

### Testing

- Unit test: Shows full report details
- Unit test: Resolution form validates input
- Unit test: Submit updates report status
- E2E test: Resolve a report

---

## Phase 5.23: Revenue Dashboard Page

**Goal**: Page showing revenue analytics and history.

### UI Routes

| Route                | Purpose           |
| -------------------- | ----------------- |
| `/publisher/revenue` | Revenue dashboard |

### Tasks

1. **Create revenue dashboard page**
   - Create `/src/routes/publisher/revenue/index.tsx`
   - Require owner role
   - Total revenue summary (gross, fees, net)
   - Revenue chart over time
   - Revenue by deck breakdown
   - Recent transactions table
   - Export CSV button
   - Link to Stripe dashboard

2. **Create RevenueChart component**
   - Create `/src/components/publisher/RevenueChart.tsx`
   - Bar or line chart of revenue over time
   - Toggle between gross and net
   - Date range selector
   - Compare to previous period

3. **Create RevenueTable component**
   - Create `/src/components/publisher/RevenueTable.tsx`
   - List of revenue records
   - Show date, deck, gross, fee, net
   - Pagination
   - Sortable columns

### Files to Create/Modify

- `/src/routes/publisher/revenue/index.tsx` (create)
- `/src/components/publisher/RevenueChart.tsx` (create)
- `/src/components/publisher/RevenueTable.tsx` (create)

### Testing

- Unit test: Shows revenue totals
- Unit test: Chart renders correctly
- Unit test: Table shows transactions
- Unit test: Export button triggers download
- E2E test: View revenue dashboard

---

## Phase 5.24: Publisher Navigation Updates

**Goal**: Update publisher navigation with analytics and reports links.

### Tasks

1. **Update publisher layout navigation**
   - Modify `/src/routes/publisher.tsx`
   - Add Analytics link
   - Add Reports link with pending count badge
   - Add Revenue link (owner only)

2. **Create pending reports badge**
   - Fetch pending count on layout load
   - Display badge if count > 0
   - Update when reports are resolved

### Files to Create/Modify

- `/src/routes/publisher.tsx` (modify)

### Testing

- Unit test: Navigation shows all links
- Unit test: Reports badge shows count
- Unit test: Revenue link hidden for non-owners
- E2E test: Navigate between publisher sections

---

## Phase 5.25: Email Notifications for Reports (Optional)

**Goal**: Send email notifications when questions are reported.

### Tasks

1. **Create email notification service**
   - Create `/src/lib/email/notifications.ts`
   - `notifyNewReport(report, question, org)` - Send to org editors
   - Use existing email provider or queue for later

2. **Trigger notification on report submission**
   - Modify `/src/routes/api.reports.submit.ts`
   - Send notification after creating report
   - Rate limit to prevent spam

3. **Create notification preferences**
   - Add notification settings to organization
   - Allow disabling report notifications

### Files to Create/Modify

- `/src/lib/email/notifications.ts` (create)
- `/src/routes/api.reports.submit.ts` (modify)

### Testing

- Unit test: Email sent for new reports
- Unit test: Rate limiting prevents spam
- Unit test: Respects notification preferences

---

## Phase 5.26: Question Performance Alerts

**Goal**: Alert publishers to problematic questions.

### Tasks

1. **Create question alert logic**
   - Create `/src/lib/publisher/question-alerts.ts`
   - `checkQuestionHealth(questionId)` - Analyze performance
   - Flag questions with accuracy < 30% (too hard)
   - Flag questions with accuracy > 95% (too easy)
   - Flag questions with multiple reports
   - Flag questions with very long avg time

2. **Add alerts to analytics pages**
   - Show warning icons on dashboard
   - Show alert banner on question performance page
   - Link to affected questions

### Files to Create/Modify

- `/src/lib/publisher/question-alerts.ts` (create)
- `/src/routes/publisher/analytics/index.tsx` (modify)
- `/src/routes/publisher/analytics/$deckId/questions.tsx` (modify)

### Testing

- Unit test: Detects too-hard questions
- Unit test: Detects too-easy questions
- Unit test: Detects reported questions
- Unit test: Alerts appear in UI

---

## Phase 5.27: Analytics Data Caching

**Goal**: Improve analytics performance with caching.

### Tasks

1. **Create analytics cache layer**
   - Create `/src/lib/analytics/cache.ts`
   - Cache expensive aggregation queries
   - Invalidate on relevant data changes
   - Use TanStack Query cache on client

2. **Optimize heavy queries**
   - Add database indexes for analytics queries
   - Pre-aggregate data where possible
   - Consider materialized views for complex stats

3. **Add loading states**
   - Skeleton loaders for charts
   - Progressive loading for large datasets

### Files to Create/Modify

- `/src/lib/analytics/cache.ts` (create)
- `/src/db/schema.ts` (modify - add indexes)

### Testing

- Unit test: Cache returns stored data
- Unit test: Cache invalidates correctly
- Performance test: Analytics pages load quickly

---
