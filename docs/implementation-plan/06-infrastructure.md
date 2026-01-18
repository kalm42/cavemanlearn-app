# Infrastructure and Configuration

> **See [00-overview.md](./00-overview.md) for project overview, codebase state, and quality requirements.**

## Environment Variables

Add to `/src/env.ts`:

```typescript
// Stripe
STRIPE_SECRET_KEY: z.string(),
STRIPE_WEBHOOK_SECRET: z.string(),
STRIPE_CONNECT_CLIENT_ID: z.string().optional(),
VITE_STRIPE_PUBLISHABLE_KEY: z.string(),

// Cloudflare R2
R2_ACCOUNT_ID: z.string(),
R2_ACCESS_KEY_ID: z.string(),
R2_SECRET_ACCESS_KEY: z.string(),
R2_BUCKET_NAME: z.string(),
R2_PUBLIC_URL: z.string(),

// Clerk Webhooks
CLERK_WEBHOOK_SECRET: z.string(),
```

---

## Package Dependencies

```bash
# Phase 1 - Webhooks
pnpm add svix

# Phase 2 - Content (no code highlighting - targeting non-developers)
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header katex @aws-sdk/client-s3

# Phase 3 - Payments
pnpm add stripe @stripe/stripe-js

# Phase 4 - Analytics
pnpm add recharts
```

---

## New Directory Structure

```
src/
├── components/
│   ├── ui/
│   ├── user/
│   ├── organization/
│   ├── editor/
│   ├── deck/
│   ├── question/
│   ├── marketplace/
│   ├── subscription/
│   ├── practice/
│   ├── analytics/
│   └── publisher/
├── db/
│   └── schema.ts
├── integrations/
│   ├── clerk/          (existing)
│   ├── tanstack-query/ (existing)
│   ├── stripe/
│   │   ├── server.ts
│   │   ├── client.ts
│   │   └── webhooks.ts
│   ├── r2/
│   │   └── client.ts
│   └── tiptap/
│       ├── editor.tsx
│       └── extensions.ts
├── lib/
│   ├── auth.ts
│   ├── permissions.ts
│   ├── slug.ts
│   ├── pricing.ts
│   ├── analytics.ts
│   └── validation/
│       ├── user.ts
│       └── organization.ts
└── routes/
    ├── api.user.*.ts
    ├── api.organizations.*.ts
    ├── api.decks.*.ts
    ├── api.questions.*.ts
    ├── api.marketplace.*.ts
    ├── api.subscriptions.*.ts
    ├── api.practice.*.ts
    ├── api.analytics.*.ts
    ├── api.publisher.*.ts
    ├── api.webhooks.*.ts
    ├── api.reports.*.ts
    ├── onboarding.tsx
    ├── settings/
    ├── marketplace/
    ├── checkout/
    ├── learner/
    └── publisher/
```

---

## Authorization Strategy

Create `/src/lib/permissions.ts`:

```typescript
export type OrgRole = 'owner' | 'admin' | 'editor' | 'writer' | 'viewer'

export const canEditDeck = (role: OrgRole) => ['owner', 'admin', 'editor', 'writer'].includes(role)

export const canPublishDeck = (role: OrgRole) => ['owner', 'admin', 'editor'].includes(role)

export const canApproveQuestion = (role: OrgRole) => ['owner', 'admin', 'editor'].includes(role)

export const canManageMembers = (role: OrgRole) => ['owner', 'admin'].includes(role)

export const canManageBilling = (role: OrgRole) => role === 'owner'

export const canDeleteOrganization = (role: OrgRole) => role === 'owner'

export const canViewDeckContent = async (userId: string, deckId: string, db: Database) => {
	const subscription = await db.query.subscriptions.findFirst({
		where: and(
			eq(subscriptions.userId, userId),
			eq(subscriptions.deckId, deckId),
			eq(subscriptions.status, 'active'),
		),
	})
	return !!subscription
}
```

---

## Critical Files to Modify

1. **`/src/db/schema.ts`** - Extend with all new tables
2. **`/src/routes/__root.tsx`** - Add user profile context, update navigation
3. **`/src/env.ts`** - Add new environment variables
4. **`vitest.config.ts`** - Add coverage thresholds

---

## Implementation Order

```
Phase 1 ──────────────────────────────────────────┐
   │                                              │
   ▼                                              │
Phase 2 ─────────────┐                            │
   │                 │                            │
   │                 ▼                            │
   │            Phase 3 ◄─────────────────────────┘
   │                 │
   ▼                 │
Phase 4 ◄────────────┘
   │
   ▼
Phase 5
```

**Dependencies:**

- Phase 2 requires Phase 1 (users, organizations)
- Phase 3 requires Phase 1 (users) and Phase 2 (decks)
- Phase 4 requires Phase 3 (subscriptions to access content)
- Phase 5 requires Phase 4 (question attempts for analytics)

---

## Coverage Milestones

| Phase   | Target | Enforcement              |
| ------- | ------ | ------------------------ |
| Phase 1 | 50%    | CI fails below threshold |
| Phase 2 | 70%    | CI fails below threshold |
| Phase 3 | 70%    | Maintain threshold       |
| Phase 4 | 70%    | Maintain threshold       |
| Phase 5 | 70%    | Maintain threshold       |

After completing Phase 2, update the coverage threshold in both:

- `.github/workflows/ci.yml` (THRESHOLD variable)
- `vitest.config.ts` (thresholds object)
