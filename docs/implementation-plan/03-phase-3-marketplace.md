# Phase 3: Marketplace and Subscriptions

> **See [00-overview.md](./00-overview.md) for project overview, codebase state, and quality requirements.**

**Goal**: Enable learners to discover, preview, and subscribe to decks via Stripe.

**Coverage Target**: Maintain 70% minimum.

---

## Phase 3.1: Stripe Environment Setup

**Goal**: Configure Stripe environment variables and install dependencies.

### Tasks

1. **Add Stripe environment variables**
   - Update `/src/env.ts` with Stripe config
   - Add STRIPE_SECRET_KEY (server-side)
   - Add STRIPE_WEBHOOK_SECRET (webhook verification)
   - Add STRIPE_CONNECT_CLIENT_ID (optional, for Connect)
   - Add VITE_STRIPE_PUBLISHABLE_KEY (client-side)

2. **Install Stripe packages**
   - Run `pnpm add stripe @stripe/stripe-js`

3. **Create .env.local template update**
   - Document required Stripe keys
   - Add test mode keys for development

### Files to Create/Modify

- `/src/env.ts` (modify)

### Dependencies

```bash
pnpm add stripe @stripe/stripe-js
```

### Testing

- Unit test: Environment validation for Stripe keys

---

## Phase 3.2: Stripe Server Client

**Goal**: Create server-side Stripe client for API calls.

### Tasks

1. **Create Stripe server client**
   - Create `/src/integrations/stripe/server.ts`
   - Initialize Stripe with secret key
   - Configure API version
   - Export typed Stripe instance

2. **Create helper functions**
   - `createCustomer(email, userId)` - Create Stripe customer
   - `getCustomer(customerId)` - Retrieve customer
   - `createCheckoutSession(params)` - Create checkout session
   - `createBillingPortalSession(customerId)` - Create portal session

### Files to Create/Modify

- `/src/integrations/stripe/server.ts` (create)

### Testing

- Unit test: Client initializes correctly
- MSW: Mock Stripe API responses for each helper

---

## Phase 3.3: Stripe Client Helpers

**Goal**: Create client-side Stripe utilities for React components.

### Tasks

1. **Create Stripe client loader**
   - Create `/src/integrations/stripe/client.ts`
   - Load Stripe.js with publishable key
   - Export `getStripe()` function (singleton pattern)

2. **Create redirect helper**
   - `redirectToCheckout(sessionId)` - Redirect to Stripe Checkout

3. **Create price formatting utilities**
   - Create `/src/lib/pricing.ts`
   - `formatPrice(cents, currency)` - Format cents to display price
   - `calculateYearlySavings(monthly, yearly)` - Calculate discount percentage

### Files to Create/Modify

- `/src/integrations/stripe/client.ts` (create)
- `/src/lib/pricing.ts` (create)

### Testing

- Unit test: Price formatting handles various currencies
- Unit test: Yearly savings calculation is accurate
- Unit test: Stripe client loads singleton correctly

---

## Phase 3.4: Database Schema - Deck Pricing

**Goal**: Create table for storing deck subscription prices.

### Database Schema

```typescript
export const deckPricing = pgTable('deck_pricing', {
	id: uuid().primaryKey().defaultRandom(),
	deckId: uuid('deck_id')
		.references(() => decks.id, { onDelete: 'cascade' })
		.notNull()
		.unique(),
	monthlyPriceCents: integer('monthly_price_cents').notNull(),
	yearlyPriceCents: integer('yearly_price_cents').notNull(),
	stripePriceIdMonthly: text('stripe_price_id_monthly'),
	stripePriceIdYearly: text('stripe_price_id_yearly'),
	stripeProductId: text('stripe_product_id'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
})
```

### Tasks

1. **Add deckPricing table to schema**
   - Define table in `/src/db/schema.ts`
   - One-to-one relationship with decks
   - Store prices in cents (avoid floating point issues)

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `DeckPricing`, `NewDeckPricing` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types are correct
- Unit test: Verify unique constraint on deckId

---

## Phase 3.5: Database Schema - Subscriptions

**Goal**: Create table for tracking user subscriptions.

### Database Schema

```typescript
export const subscriptions = pgTable(
	'subscriptions',
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: uuid('user_id')
			.references(() => userProfiles.id)
			.notNull(),
		deckId: uuid('deck_id')
			.references(() => decks.id)
			.notNull(),
		stripeSubscriptionId: text('stripe_subscription_id').notNull().unique(),
		stripeCustomerId: text('stripe_customer_id').notNull(),
		status: text({
			enum: ['active', 'canceled', 'past_due', 'trialing', 'incomplete'],
		}).notNull(),
		billingInterval: text('billing_interval', {
			enum: ['month', 'year'],
		}).notNull(),
		currentPeriodStart: timestamp('current_period_start').notNull(),
		currentPeriodEnd: timestamp('current_period_end').notNull(),
		cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
		canceledAt: timestamp('canceled_at'),
		createdAt: timestamp('created_at').defaultNow(),
	},
	(table) => ({
		uniqueUserDeck: unique().on(table.userId, table.deckId),
	}),
)
```

### Tasks

1. **Add subscriptions table to schema**
   - Define table in `/src/db/schema.ts`
   - Unique constraint on user + deck (one subscription per deck per user)
   - Track Stripe subscription and customer IDs

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `Subscription`, `NewSubscription` types
   - Export `SubscriptionStatus`, `BillingInterval` enum types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify status enum values
- Unit test: Verify billing interval enum values

---

## Phase 3.6: Database Schema - Sample Questions

**Goal**: Create table for marking questions as preview samples.

### Database Schema

```typescript
export const sampleQuestions = pgTable('sample_questions', {
	id: uuid().primaryKey().defaultRandom(),
	deckId: uuid('deck_id')
		.references(() => decks.id, { onDelete: 'cascade' })
		.notNull(),
	questionId: uuid('question_id')
		.references(() => questions.id, { onDelete: 'cascade' })
		.notNull(),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').defaultNow(),
})
```

### Tasks

1. **Add sampleQuestions table to schema**
   - Define table in `/src/db/schema.ts`
   - Junction table linking decks to preview questions
   - Support ordering of samples

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `SampleQuestion`, `NewSampleQuestion` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify cascade delete from deck
- Unit test: Verify cascade delete from question

---

## Phase 3.7: Database Schema - Publisher Stripe Accounts

**Goal**: Create table for Stripe Connect account information.

### Database Schema

```typescript
export const publisherStripeAccounts = pgTable('publisher_stripe_accounts', {
	id: uuid().primaryKey().defaultRandom(),
	organizationId: uuid('organization_id')
		.references(() => organizations.id)
		.notNull()
		.unique(),
	stripeAccountId: text('stripe_account_id').notNull().unique(),
	chargesEnabled: boolean('charges_enabled').notNull().default(false),
	payoutsEnabled: boolean('payouts_enabled').notNull().default(false),
	onboardingComplete: boolean('onboarding_complete').notNull().default(false),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at').defaultNow(),
})
```

### Tasks

1. **Add publisherStripeAccounts table to schema**
   - Define table in `/src/db/schema.ts`
   - One-to-one relationship with organizations
   - Track Connect account status flags

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `PublisherStripeAccount`, `NewPublisherStripeAccount` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify unique constraint on organizationId

---

## Phase 3.8: Deck Pricing API

**Goal**: API endpoints for managing deck subscription prices.

### API Endpoints

| Endpoint                     | Method | Purpose          |
| ---------------------------- | ------ | ---------------- |
| `/api/decks/:deckId/pricing` | GET    | Get deck pricing |
| `/api/decks/:deckId/pricing` | PUT    | Set deck pricing |

### Tasks

1. **Create GET /api/decks/:deckId/pricing endpoint**
   - Create `/src/routes/api.decks.$deckId.pricing.ts`
   - Verify user is member of deck's org
   - Return pricing or null if not set

2. **Create PUT /api/decks/:deckId/pricing endpoint**
   - Verify user has admin+ role in org
   - Validate price inputs (positive integers)
   - Create or update pricing record
   - Create/update Stripe Product and Prices
   - Store Stripe IDs in database

3. **Create Stripe product sync helper**
   - Create `/src/lib/stripe-sync.ts`
   - `syncDeckToStripe(deck, pricing)` - Create/update Stripe product
   - `createStripePrices(productId, monthly, yearly)` - Create price objects

4. **Create validation schema**
   - Create `/src/lib/validation/pricing.ts`
   - Define Zod schema for pricing update

### Files to Create/Modify

- `/src/routes/api.decks.$deckId.pricing.ts` (create)
- `/src/lib/stripe-sync.ts` (create)
- `/src/lib/validation/pricing.ts` (create)

### Testing

- Integration test: GET returns 403 for non-members
- Integration test: GET returns pricing or null
- Integration test: PUT returns 403 for non-admins
- Integration test: PUT validates positive prices
- Integration test: PUT creates Stripe product (with mocked Stripe)
- Integration test: Pricing creation stores Stripe IDs in database
- Integration test: Pricing update syncs to Stripe
- MSW: Mock Stripe product/price creation

---

## Phase 3.9: Sample Questions API

**Goal**: API endpoints for managing deck preview samples.

### API Endpoints

| Endpoint                     | Method | Purpose               |
| ---------------------------- | ------ | --------------------- |
| `/api/decks/:deckId/samples` | GET    | List sample questions |
| `/api/decks/:deckId/samples` | PUT    | Set sample questions  |

### Tasks

1. **Create GET /api/decks/:deckId/samples endpoint**
   - Create `/src/routes/api.decks.$deckId.samples.ts`
   - Public endpoint (no auth required for published decks)
   - Return sample questions with full content
   - Order by sortOrder

2. **Create PUT /api/decks/:deckId/samples endpoint**
   - Verify user has editor+ role in org
   - Accept array of question IDs
   - Validate questions belong to deck
   - Validate questions are approved
   - Replace all samples (delete old, create new)
   - Limit to 5 samples max

3. **Create validation schema**
   - Add to `/src/lib/validation/deck.ts`
   - Define Zod schema for samples update

### Files to Create/Modify

- `/src/routes/api.decks.$deckId.samples.ts` (create)
- `/src/lib/validation/deck.ts` (modify)

### Testing

- Integration test: GET returns samples for published deck
- Integration test: GET returns 404 for unpublished deck (non-member)
- Integration test: PUT returns 403 for writers
- Integration test: PUT validates question ownership
- Integration test: PUT enforces 5 sample limit
- Integration test: PUT replaces all samples
- Integration test: Sample questions are limited to 5
- Integration test: Sample questions must be approved
- Integration test: Sample questions are ordered by sortOrder

---

## Phase 3.10: Marketplace List API

**Goal**: API endpoint for browsing published decks.

### API Endpoints

| Endpoint           | Method | Purpose              |
| ------------------ | ------ | -------------------- |
| `/api/marketplace` | GET    | List published decks |

### Tasks

1. **Create GET /api/marketplace endpoint**
   - Create `/src/routes/api.marketplace.ts`
   - Public endpoint (no auth required)
   - Return only published decks with pricing
   - Support search query parameter
   - Support pagination (limit, offset)
   - Support sorting (newest, popular, price-low, price-high)
   - Include organization name and logo
   - Include question count and topic count

2. **Create marketplace query helpers**
   - Create `/src/lib/marketplace.ts`
   - `searchDecks(query, options)` - Build search query
   - `getDeckPreview(deckId)` - Get deck preview data

### Files to Create/Modify

- `/src/routes/api.marketplace.ts` (create)
- `/src/lib/marketplace.ts` (create)

### Testing

- Integration test: Returns only published decks
- Integration test: Returns empty for unpublished decks
- Integration test: Search filters by title/description
- Integration test: Pagination works correctly
- Integration test: Sorting works for all options
- Integration test: Includes pricing and org info

---

## Phase 3.11: Marketplace Deck Details API

**Goal**: API endpoint for viewing a single deck's public details.

### API Endpoints

| Endpoint                     | Method | Purpose                    |
| ---------------------------- | ------ | -------------------------- |
| `/api/marketplace/:deckSlug` | GET    | Get deck details + samples |

### Tasks

1. **Create GET /api/marketplace/:deckSlug endpoint**
   - Create `/src/routes/api.marketplace.$deckSlug.ts`
   - Public endpoint
   - Return 404 if deck not published
   - Include deck details, pricing, org info
   - Include sample questions with full content
   - Include topic list (names only)
   - Include total question count
   - If authenticated, include user's subscription status

### Files to Create/Modify

- `/src/routes/api.marketplace.$deckSlug.ts` (create)

### Testing

- Integration test: Returns 404 for unpublished deck
- Integration test: Returns 404 for non-existent slug
- Integration test: Returns deck with samples
- Integration test: Includes subscription status when authenticated
- Integration test: Excludes subscription status when unauthenticated

---

## Phase 3.12: User Subscriptions List API

**Goal**: API endpoint for listing user's active subscriptions.

### API Endpoints

| Endpoint             | Method | Purpose                   |
| -------------------- | ------ | ------------------------- |
| `/api/subscriptions` | GET    | List user's subscriptions |

### Tasks

1. **Create GET /api/subscriptions endpoint**
   - Create `/src/routes/api.subscriptions.ts`
   - Require authentication
   - Return all subscriptions for current user
   - Include deck info (title, slug, cover image)
   - Include subscription status and billing info
   - Include next billing date
   - Order by status (active first), then by name

### Files to Create/Modify

- `/src/routes/api.subscriptions.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns empty array for user with no subscriptions
- Integration test: Returns subscriptions with deck info
- Integration test: Orders active subscriptions first

---

## Phase 3.13: Stripe Checkout Session API

**Goal**: API endpoint for creating Stripe Checkout sessions.

### API Endpoints

| Endpoint                      | Method | Purpose                        |
| ----------------------------- | ------ | ------------------------------ |
| `/api/subscriptions/checkout` | POST   | Create Stripe Checkout session |

### Tasks

1. **Create POST /api/subscriptions/checkout endpoint**
   - Create `/src/routes/api.subscriptions.checkout.ts`
   - Require authentication
   - Validate request body (deckId, billingInterval)
   - Check user doesn't already have active subscription
   - Get or create Stripe customer for user
   - Create Checkout session with deck's Stripe price
   - Configure success/cancel URLs
   - Enable Stripe Connect for publisher revenue split
   - Return session ID and URL

2. **Create customer management helper**
   - Add to `/src/integrations/stripe/server.ts`
   - `getOrCreateCustomer(userId, email)` - Manage customer records
   - Store Stripe customer ID in user profile or separate table

3. **Create validation schema**
   - Create `/src/lib/validation/checkout.ts`
   - Define Zod schema for checkout request

### Files to Create/Modify

- `/src/routes/api.subscriptions.checkout.ts` (create)
- `/src/integrations/stripe/server.ts` (modify)
- `/src/lib/validation/checkout.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 400 for invalid deckId
- Integration test: Returns 409 if already subscribed
- Integration test: Creates checkout session successfully (with mocked Stripe)
- Integration test: Returns session ID and URL
- Integration test: Creates subscription record on checkout completion
- Integration test: Links subscription to user and deck
- MSW: Mock Stripe checkout session creation

---

## Phase 3.14: Stripe Customer Portal API

**Goal**: API endpoint for accessing Stripe billing portal.

### API Endpoints

| Endpoint                    | Method | Purpose                        |
| --------------------------- | ------ | ------------------------------ |
| `/api/subscriptions/portal` | POST   | Create Customer Portal session |

### Tasks

1. **Create POST /api/subscriptions/portal endpoint**
   - Create `/src/routes/api.subscriptions.portal.ts`
   - Require authentication
   - Get user's Stripe customer ID
   - Return 404 if user has no customer record
   - Create billing portal session
   - Configure return URL
   - Return portal URL

### Files to Create/Modify

- `/src/routes/api.subscriptions.portal.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 404 if no customer record
- Integration test: Returns portal URL
- MSW: Mock Stripe portal session creation

---

## Phase 3.15: Subscription Cancel API

**Goal**: API endpoint for canceling subscriptions.

### API Endpoints

| Endpoint                                    | Method | Purpose             |
| ------------------------------------------- | ------ | ------------------- |
| `/api/subscriptions/:subscriptionId/cancel` | POST   | Cancel subscription |

### Tasks

1. **Create POST /api/subscriptions/:subscriptionId/cancel endpoint**
   - Create `/src/routes/api.subscriptions.$subscriptionId.cancel.ts`
   - Require authentication
   - Verify subscription belongs to current user
   - Call Stripe to cancel at period end
   - Update subscription record
   - Return updated subscription

2. **Add reactivation support**
   - If cancelAtPeriodEnd is true, allow un-canceling
   - POST with `reactivate: true` removes cancellation

### Files to Create/Modify

- `/src/routes/api.subscriptions.$subscriptionId.cancel.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 403 for other user's subscription
- Integration test: Returns 404 for non-existent subscription
- Integration test: Cancels subscription at period end
- Integration test: Reactivates canceled subscription
- MSW: Mock Stripe subscription update

---

## Phase 3.16: Stripe Webhook Handler - Setup

**Goal**: Create webhook endpoint and verification infrastructure.

### Tasks

1. **Create webhook endpoint**
   - Create `/src/routes/api.webhooks.stripe.ts`
   - Accept POST requests with raw body
   - Verify webhook signature using STRIPE_WEBHOOK_SECRET
   - Return 400 for invalid signature
   - Parse event and route to handlers
   - Return 200 for successful processing

2. **Create webhook event router**
   - Create `/src/integrations/stripe/webhooks.ts`
   - Export `handleStripeWebhook(event)` function
   - Route to specific handlers by event type
   - Log unhandled event types

### Files to Create/Modify

- `/src/routes/api.webhooks.stripe.ts` (create)
- `/src/integrations/stripe/webhooks.ts` (create)

### Testing

- Integration test: Rejects invalid signature (or unit test with mocked verification)
- Integration test: Accepts valid signature
- Integration test: Routes events to correct handlers
- Integration test: Returns 200 for unhandled events

---

## Phase 3.17: Stripe Webhook - Checkout Completed

**Goal**: Handle checkout.session.completed event to create subscriptions.

### Tasks

1. **Create checkout completed handler**
   - Add to `/src/integrations/stripe/webhooks.ts`
   - `handleCheckoutCompleted(session)` function
   - Extract subscription ID from session
   - Retrieve full subscription from Stripe
   - Create subscription record in database
   - Link to user and deck via metadata

2. **Configure checkout session metadata**
   - Update checkout creation to include userId, deckId
   - Extract metadata in webhook handler

### Files to Create/Modify

- `/src/integrations/stripe/webhooks.ts` (modify)
- `/src/routes/api.subscriptions.checkout.ts` (modify - add metadata)

### Testing

- Integration test: Creates subscription record
- Integration test: Sets correct status and dates
- Integration test: Links to correct user and deck
- Integration test: Handles missing metadata gracefully
- Integration test: Webhook creates subscription in database
- Integration test: Webhook sets correct status and dates

---

## Phase 3.18: Stripe Webhook - Subscription Updated

**Goal**: Handle subscription update events for status changes.

### Tasks

1. **Create subscription updated handler**
   - Add to `/src/integrations/stripe/webhooks.ts`
   - `handleSubscriptionUpdated(subscription)` function
   - Find subscription by Stripe ID
   - Update status, period dates, cancel flags
   - Handle status transitions (active → past_due, etc.)

2. **Create subscription deleted handler**
   - `handleSubscriptionDeleted(subscription)` function
   - Mark subscription as canceled
   - Set canceledAt timestamp

### Files to Create/Modify

- `/src/integrations/stripe/webhooks.ts` (modify)

### Testing

- Integration test: Updates status correctly
- Integration test: Updates period dates
- Integration test: Handles cancel_at_period_end flag
- Integration test: Marks deleted subscription as canceled
- Integration test: Ignores unknown subscription IDs
- Integration test: Webhook updates subscription status
- Integration test: Webhook updates period dates
- Integration test: Webhook handles cancel_at_period_end flag

---

## Phase 3.19: Stripe Webhook - Invoice Events

**Goal**: Handle invoice events for payment tracking.

### Tasks

1. **Create invoice payment succeeded handler**
   - Add to `/src/integrations/stripe/webhooks.ts`
   - `handleInvoicePaymentSucceeded(invoice)` function
   - Update subscription status if was past_due
   - Record payment for revenue tracking (Phase 5)

2. **Create invoice payment failed handler**
   - `handleInvoicePaymentFailed(invoice)` function
   - Update subscription status to past_due
   - Could trigger email notification (future)

### Files to Create/Modify

- `/src/integrations/stripe/webhooks.ts` (modify)

### Testing

- Integration test: Payment succeeded updates past_due to active
- Integration test: Payment failed updates to past_due
- Integration test: Handles missing subscription gracefully
- Integration test: Invoice payment succeeded updates subscription
- Integration test: Invoice payment failed updates to past_due

---

## Phase 3.20: Stripe Connect - Onboarding API

**Goal**: API endpoint for publishers to start Stripe Connect onboarding.

### API Endpoints

| Endpoint                        | Method | Purpose                        |
| ------------------------------- | ------ | ------------------------------ |
| `/api/publisher/stripe/onboard` | POST   | Create Connect onboarding link |

### Tasks

1. **Create POST /api/publisher/stripe/onboard endpoint**
   - Create `/src/routes/api.publisher.stripe.onboard.ts`
   - Require authentication
   - Require publisher user type
   - Verify user is owner/admin of organization
   - Create or retrieve Stripe Connect account
   - Create account link for onboarding
   - Store Connect account ID in database
   - Return onboarding URL

2. **Configure Stripe Connect**
   - Use Express account type
   - Configure platform settings (70/30 split)
   - Set refresh and return URLs

### Files to Create/Modify

- `/src/routes/api.publisher.stripe.onboard.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 403 for non-publishers
- Integration test: Returns 403 for non-admins
- Integration test: Creates Connect account (with mocked Stripe)
- Integration test: Returns onboarding URL
- MSW: Mock Stripe Connect account creation

---

## Phase 3.21: Stripe Connect - Dashboard API

**Goal**: API endpoint for publishers to access Stripe Express Dashboard.

### API Endpoints

| Endpoint                          | Method | Purpose                    |
| --------------------------------- | ------ | -------------------------- |
| `/api/publisher/stripe/dashboard` | GET    | Get Express Dashboard link |

### Tasks

1. **Create GET /api/publisher/stripe/dashboard endpoint**
   - Create `/src/routes/api.publisher.stripe.dashboard.ts`
   - Require authentication
   - Verify user is owner/admin of organization
   - Get organization's Connect account
   - Return 404 if no Connect account
   - Create login link to Express Dashboard
   - Return dashboard URL

### Files to Create/Modify

- `/src/routes/api.publisher.stripe.dashboard.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 403 for non-admins
- Integration test: Returns 404 if no Connect account
- Integration test: Returns dashboard URL
- MSW: Mock Stripe login link creation

---

## Phase 3.22: Stripe Webhook - Connect Account Updated

**Goal**: Handle Connect account updates for onboarding status.

### Tasks

1. **Create account updated handler**
   - Add to `/src/integrations/stripe/webhooks.ts`
   - `handleAccountUpdated(account)` function
   - Find publisher account by Stripe account ID
   - Update charges_enabled, payouts_enabled flags
   - Determine if onboarding is complete
   - Update database record

### Files to Create/Modify

- `/src/integrations/stripe/webhooks.ts` (modify)

### Testing

- Integration test: Updates charges_enabled flag
- Integration test: Updates payouts_enabled flag
- Integration test: Sets onboardingComplete when both enabled
- Integration test: Ignores unknown account IDs

---

## Phase 3.23: Marketplace UI - Browse Page

**Goal**: Page for learners to browse published decks.

### UI Routes

| Route          | Purpose          |
| -------------- | ---------------- |
| `/marketplace` | Browse all decks |

### Tasks

1. **Create marketplace index page**
   - Create `/src/routes/marketplace/index.tsx`
   - Public page (no auth required)
   - Search bar at top
   - Filter/sort controls
   - Grid of deck preview cards
   - Pagination controls

2. **Create SearchBar component**
   - Create `/src/components/marketplace/SearchBar.tsx`
   - Search input with debounce
   - Clear button
   - Update URL query params

3. **Create DeckFilters component**
   - Create `/src/components/marketplace/DeckFilters.tsx`
   - Sort dropdown (newest, popular, price)
   - Category filter (future)

### Files to Create/Modify

- `/src/routes/marketplace/index.tsx` (create)
- `/src/components/marketplace/SearchBar.tsx` (create)
- `/src/components/marketplace/DeckFilters.tsx` (create)

### Testing

- Unit test: SearchBar debounces input
- Unit test: DeckFilters updates query params
- E2E test: Search for deck by name
- E2E test: Sort decks by price

---

## Phase 3.24: Marketplace UI - Deck Preview Card

**Goal**: Card component for displaying deck in marketplace.

### Tasks

1. **Create DeckPreviewCard component**
   - Create `/src/components/marketplace/DeckPreviewCard.tsx`
   - Cover image (or placeholder)
   - Deck title and description (truncated)
   - Publisher/organization name
   - Question count and topic count
   - Price display (monthly/yearly)
   - Link to deck detail page

2. **Create PricingBadge component**
   - Create `/src/components/marketplace/PricingBadge.tsx`
   - Show monthly price
   - Optional "Save X%" for yearly

### Files to Create/Modify

- `/src/components/marketplace/DeckPreviewCard.tsx` (create)
- `/src/components/marketplace/PricingBadge.tsx` (create)

### Testing

- Unit test: Card renders all deck info
- Unit test: Card shows placeholder for missing image
- Unit test: PricingBadge shows correct format
- Unit test: Card links to correct detail page

---

## Phase 3.25: Marketplace UI - Deck Detail Page

**Goal**: Page showing full deck details with sample questions.

### UI Routes

| Route                    | Purpose           |
| ------------------------ | ----------------- |
| `/marketplace/:deckSlug` | Deck preview page |

### Tasks

1. **Create deck detail page**
   - Create `/src/routes/marketplace/$deckSlug.tsx`
   - Deck title, description, cover image
   - Publisher info with logo
   - Full topic list
   - Question count
   - Pricing card with subscribe buttons
   - Sample questions section

2. **Create PricingCard component**
   - Create `/src/components/marketplace/PricingCard.tsx`
   - Monthly/yearly toggle
   - Price display with savings
   - Subscribe button
   - Shows "Subscribed" if already subscribed

3. **Create SampleQuestionViewer component**
   - Create `/src/components/marketplace/SampleQuestionViewer.tsx`
   - Display sample questions
   - Show question and answer options
   - "Try it" button to see answer/explanation
   - Navigation between samples

### Files to Create/Modify

- `/src/routes/marketplace/$deckSlug.tsx` (create)
- `/src/components/marketplace/PricingCard.tsx` (create)
- `/src/components/marketplace/SampleQuestionViewer.tsx` (create)

### Testing

- Unit test: Page shows deck info
- Unit test: PricingCard toggles between intervals
- Unit test: SampleQuestionViewer navigates samples
- Unit test: Subscribe button disabled when subscribed
- E2E test: View deck and try sample question

---

## Phase 3.26: Subscription UI - Pricing Toggle

**Goal**: Component for switching between monthly/yearly pricing.

### Tasks

1. **Create PricingToggle component**
   - Create `/src/components/subscription/PricingToggle.tsx`
   - Two options: Monthly / Yearly
   - Highlight active option
   - Show savings percentage on yearly
   - Emit onChange with selected interval

### Files to Create/Modify

- `/src/components/subscription/PricingToggle.tsx` (create)

### Testing

- Unit test: Shows both options
- Unit test: Highlights active option
- Unit test: Shows savings percentage
- Unit test: Emits correct value on change

---

## Phase 3.27: Subscription UI - Checkout Button

**Goal**: Button component that initiates Stripe Checkout.

### Tasks

1. **Create CheckoutButton component**
   - Create `/src/components/subscription/CheckoutButton.tsx`
   - Accept deckId and billingInterval props
   - Loading state during API call
   - Call checkout API to get session
   - Redirect to Stripe Checkout
   - Handle errors (show toast)

### Files to Create/Modify

- `/src/components/subscription/CheckoutButton.tsx` (create)

### Testing

- Unit test: Shows loading state
- Unit test: Calls checkout API with correct params
- Unit test: Handles API errors gracefully
- MSW: Mock checkout session response

---

## Phase 3.28: Checkout UI - Success/Cancel Pages

**Goal**: Pages shown after Stripe Checkout completes or is canceled.

### UI Routes

| Route                | Purpose               |
| -------------------- | --------------------- |
| `/checkout/success`  | Post-checkout success |
| `/checkout/canceled` | Checkout canceled     |

### Tasks

1. **Create checkout success page**
   - Create `/src/routes/checkout/success.tsx`
   - Show success message
   - Link to subscribed deck
   - Link to start practicing

2. **Create checkout canceled page**
   - Create `/src/routes/checkout/canceled.tsx`
   - Show canceled message
   - Link back to marketplace
   - Encourage to try again

### Files to Create/Modify

- `/src/routes/checkout/success.tsx` (create)
- `/src/routes/checkout/canceled.tsx` (create)

### Testing

- Unit test: Success page shows correct message
- Unit test: Success page links to practice
- Unit test: Canceled page shows correct message
- Unit test: Canceled page links to marketplace

---

## Phase 3.29: Learner UI - Library Page

**Goal**: Page showing learner's subscribed decks.

### UI Routes

| Route              | Purpose             |
| ------------------ | ------------------- |
| `/learner/library` | My subscribed decks |

### Tasks

1. **Create learner layout**
   - Create `/src/routes/learner.tsx` (layout)
   - Require authentication
   - Require learner user type
   - Sidebar with navigation

2. **Create library page**
   - Create `/src/routes/learner/library.tsx`
   - List all active subscriptions
   - Show deck cards with practice buttons
   - Show renewal dates
   - Empty state for no subscriptions

3. **Create SubscriptionCard component**
   - Create `/src/components/subscription/SubscriptionCard.tsx`
   - Deck info with cover image
   - Subscription status badge
   - Next billing date
   - Practice button
   - Manage subscription link

### Files to Create/Modify

- `/src/routes/learner.tsx` (create)
- `/src/routes/learner/library.tsx` (create)
- `/src/components/subscription/SubscriptionCard.tsx` (create)

### Testing

- Unit test: Layout redirects unauthenticated users
- Unit test: Library shows all subscriptions
- Unit test: SubscriptionCard shows correct status
- E2E test: View library and click practice

---

## Phase 3.30: Learner UI - Subscription Management

**Goal**: Page for managing subscriptions (cancel, reactivate).

### UI Routes

| Route                    | Purpose                 |
| ------------------------ | ----------------------- |
| `/learner/subscriptions` | Subscription management |

### Tasks

1. **Create subscriptions page**
   - Create `/src/routes/learner/subscriptions.tsx`
   - List all subscriptions (active and past)
   - Show billing details
   - Cancel subscription button
   - Reactivate button (if pending cancellation)
   - Link to Stripe billing portal

2. **Create SubscriptionStatusBadge component**
   - Create `/src/components/subscription/SubscriptionStatusBadge.tsx`
   - Different colors for each status
   - Active: green
   - Past due: yellow
   - Canceled: red
   - Canceling: orange (pending end of period)

3. **Create subscription action handlers**
   - Cancel confirmation modal
   - Reactivate confirmation
   - Portal redirect button

### Files to Create/Modify

- `/src/routes/learner/subscriptions.tsx` (create)
- `/src/components/subscription/SubscriptionStatusBadge.tsx` (create)

### Testing

- Unit test: Page shows all subscriptions
- Unit test: StatusBadge shows correct color
- Unit test: Cancel button shows confirmation
- Unit test: Reactivate works for pending cancellation
- E2E test: Cancel and reactivate subscription

---

## Phase 3.31: Publisher UI - Deck Pricing Page

**Goal**: Page for publishers to set deck subscription prices.

### UI Routes

| Route                              | Purpose          |
| ---------------------------------- | ---------------- |
| `/publisher/decks/:deckId/pricing` | Set deck pricing |

### Tasks

1. **Create pricing settings page**
   - Create `/src/routes/publisher/decks/$deckId/pricing.tsx`
   - Require admin+ role
   - Current pricing display
   - Edit form for monthly/yearly prices
   - Preview monthly/yearly with savings
   - Save button (syncs to Stripe)

2. **Create PricingForm component**
   - Create `/src/components/deck/PricingForm.tsx`
   - Monthly price input (dollars, converts to cents)
   - Yearly price input
   - Auto-calculate yearly savings
   - Validation (positive numbers, yearly < 12x monthly)

### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId/pricing.tsx` (create)
- `/src/components/deck/PricingForm.tsx` (create)

### Testing

- Unit test: Form validates positive prices
- Unit test: Form converts dollars to cents
- Unit test: Form shows savings calculation
- Unit test: Submit syncs to Stripe
- E2E test: Set deck pricing

---

## Phase 3.32: Publisher UI - Sample Questions Selection

**Goal**: Interface for selecting sample questions to show in marketplace.

### Tasks

1. **Add samples tab to deck editor**
   - Modify deck editor layout to include Samples tab
   - Link to samples management

2. **Create samples page**
   - Create `/src/routes/publisher/decks/$deckId/samples.tsx`
   - List all approved questions
   - Checkbox to mark as sample
   - Drag to reorder samples
   - Max 5 samples indicator
   - Save button

3. **Create SampleQuestionSelector component**
   - Create `/src/components/deck/SampleQuestionSelector.tsx`
   - List of approved questions
   - Checkbox for each
   - Drag handles for selected
   - Counter showing X/5 selected

### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId.tsx` (modify - add tab)
- `/src/routes/publisher/decks/$deckId/samples.tsx` (create)
- `/src/components/deck/SampleQuestionSelector.tsx` (create)

### Testing

- Unit test: Selector shows only approved questions
- Unit test: Selector enforces 5 max limit
- Unit test: Drag and drop reorders samples
- E2E test: Select and save sample questions

---

## Phase 3.33: Publisher UI - Stripe Onboarding Page

**Goal**: Page guiding publishers through Stripe Connect setup.

### UI Routes

| Route                       | Purpose             |
| --------------------------- | ------------------- |
| `/publisher/stripe-onboard` | Stripe Connect flow |

### Tasks

1. **Create Stripe onboarding page**
   - Create `/src/routes/publisher/stripe-onboard.tsx`
   - Check current Connect status
   - If not started: explain process, start button
   - If in progress: continue button, status indicators
   - If complete: show success, link to dashboard
   - Handle return from Stripe onboarding

2. **Create OnboardingStatus component**
   - Create `/src/components/publisher/OnboardingStatus.tsx`
   - Show checklist of requirements
   - Check marks for completed items
   - Current step indicator

### Files to Create/Modify

- `/src/routes/publisher/stripe-onboard.tsx` (create)
- `/src/components/publisher/OnboardingStatus.tsx` (create)

### Testing

- Unit test: Page shows correct state
- Unit test: Start button calls onboard API
- Unit test: Continue button available when in progress
- Unit test: Dashboard link shown when complete
- E2E test: Start onboarding flow

---

## Phase 3.34: Publisher UI - Payouts Dashboard

**Goal**: Page showing publisher payout status and history.

### UI Routes

| Route                | Purpose          |
| -------------------- | ---------------- |
| `/publisher/payouts` | Payout dashboard |

### Tasks

1. **Create payouts page**
   - Create `/src/routes/publisher/payouts.tsx`
   - Require completed Stripe onboarding
   - Show pending balance
   - Show payout schedule
   - Link to Stripe Express Dashboard
   - Redirect to onboarding if not complete

2. **Create PayoutSummary component**
   - Create `/src/components/publisher/PayoutSummary.tsx`
   - Pending balance display
   - Next payout date
   - Recent payouts list (from Stripe)

### Files to Create/Modify

- `/src/routes/publisher/payouts.tsx` (create)
- `/src/components/publisher/PayoutSummary.tsx` (create)

### Testing

- Unit test: Redirects if onboarding incomplete
- Unit test: Shows payout info
- Unit test: Dashboard link works
- MSW: Mock Stripe balance/payout APIs

---

## Phase 3.35: Access Control for Subscribed Content

**Goal**: Implement content access checks based on subscription status.

### Tasks

1. **Create subscription access helper**
   - Add to `/src/lib/permissions.ts`
   - `hasActiveSubscription(userId, deckId)` - Check if user can access deck
   - `getAccessibleDecks(userId)` - Get all decks user can access

2. **Update question API with access checks**
   - Modify `/src/routes/api.decks.$deckId.questions.ts`
   - For learners: check subscription before returning questions
   - For publishers: check org membership

3. **Create subscription middleware**
   - Create `/src/lib/middleware/subscription.ts`
   - Reusable middleware for subscription checks
   - Return 403 with clear message if no subscription

### Files to Create/Modify

- `/src/lib/permissions.ts` (modify)
- `/src/routes/api.decks.$deckId.questions.ts` (modify)
- `/src/lib/middleware/subscription.ts` (create)

### Testing

- Integration test: hasActiveSubscription returns true for active
- Integration test: hasActiveSubscription returns false for canceled
- Integration test: hasActiveSubscription returns false for past_due after grace
- Integration test: Questions API returns 403 without subscription
- Integration test: Questions API returns questions with subscription

---

## Phase 3.36: History Retention After Subscription End

**Goal**: Preserve performance data and analytics after subscription ends, while hiding question content.

### Tasks

1. **Update subscription access helper**
   - Modify `/src/lib/permissions.ts`
   - Add `hasAccessToQuestionContent(userId, deckId)` - Requires active subscription
   - Add `hasAccessToPerformanceData(userId, deckId)` - Always true (if user had subscription)
   - Clarify difference: content access vs. performance data access

2. **Update question access logic**
   - Modify `/src/routes/api.decks.$deckId.questions.ts`
   - Check `hasAccessToQuestionContent` for returning question content
   - Return 403 with clear message if no active subscription
   - Do NOT check subscription for question IDs or attempt metadata

3. **Update practice session API**
   - Modify `/src/routes/api.practice.start.ts`
   - Require active subscription to start new sessions
   - Allow viewing past session results regardless of subscription status

4. **Update session results API**
   - Modify `/src/routes/api.practice.$sessionId.results.ts`
   - Return aggregate statistics even without active subscription:
     - Overall score
     - Score breakdown by topic
     - Time statistics
     - Question IDs with correctness
   - Hide question content, answer options, and explanations if no active subscription
   - Show message: "Question content hidden. Resubscribe to view questions."

5. **Update analytics APIs**
   - Modify `/src/routes/api.analytics/*.ts`
   - Remove subscription checks from analytics endpoints
   - Analytics should work for all decks user has ever subscribed to
   - Return aggregate data only (no question content)

6. **Create history access helper**
   - Create `/src/lib/history-access.ts`
   - `canViewQuestionContent(userId, deckId)` - Active subscription required
   - `canViewPerformanceData(userId, deckId)` - True if user ever had subscription
   - `getHistoricalDecks(userId)` - Get all decks user has subscribed to (past or present)

### Files to Create/Modify

- `/src/lib/permissions.ts` (modify)
- `/src/routes/api.decks.$deckId.questions.ts` (modify)
- `/src/routes/api.practice.start.ts` (modify)
- `/src/routes/api.practice.$sessionId.results.ts` (modify)
- `/src/routes/api.analytics/overview.ts` (modify)
- `/src/routes/api.analytics/deck.$deckId.ts` (modify)
- `/src/routes/api.analytics/topics.ts` (modify)
- `/src/routes/api.analytics/trends.ts` (modify)
- `/src/routes/api.analytics/compare.ts` (modify)
- `/src/lib/history-access.ts` (create)

### Testing

- Integration test: hasAccessToQuestionContent requires active subscription
- Integration test: hasAccessToPerformanceData works for past subscriptions
- Integration test: Questions API returns 403 without active subscription
- Integration test: Session results return aggregates without subscription
- Integration test: Session results hide content without subscription
- Integration test: Analytics work for past subscriptions
- Integration test: Session results return aggregates without subscription
- Integration test: Session results hide content without subscription
- Integration test: Analytics work for past subscriptions
- E2E test: Cancel subscription, verify analytics still accessible
- E2E test: Cancel subscription, verify question content hidden

---

## Phase 3.37: History Retention UI

**Goal**: Update UI to handle history access after subscription ends.

### Tasks

1. **Update session results page**
   - Modify `/src/routes/learner/practice/$deckId/sessions/$sessionId.tsx`
   - Check subscription status
   - If no active subscription:
     - Show aggregate statistics
     - Show question list with IDs and correctness only
     - Hide question content
     - Show "Resubscribe to view questions" message
   - If active subscription: show full content as before

2. **Update analytics pages**
   - Modify `/src/routes/learner/analytics/*.tsx`
   - Show analytics for all historical decks
   - Indicate which decks have active subscriptions
   - Allow filtering by subscription status

3. **Update library page**
   - Modify `/src/routes/learner/library.tsx`
   - Show both active and past subscriptions
   - Indicate subscription status
   - Allow viewing analytics for past subscriptions
   - Show "Resubscribe" button for canceled subscriptions

4. **Create SubscriptionStatusBadge component**
   - Modify `/src/components/subscription/SubscriptionStatusBadge.tsx`
   - Show "Active", "Canceled", "Expired" statuses
   - Use different colors for each status

### Files to Create/Modify

- `/src/routes/learner/practice/$deckId/sessions/$sessionId.tsx` (modify)
- `/src/routes/learner/analytics/index.tsx` (modify)
- `/src/routes/learner/analytics/$deckId.tsx` (modify)
- `/src/routes/learner/library.tsx` (modify)
- `/src/components/subscription/SubscriptionStatusBadge.tsx` (modify)

### Testing

- Integration test: Session results show aggregates without subscription
- Integration test: Session results hide content without subscription
- Integration test: Analytics show historical data
- Integration test: Library shows past subscriptions
- E2E test: View analytics after canceling subscription
- E2E test: View session results after canceling subscription

---
