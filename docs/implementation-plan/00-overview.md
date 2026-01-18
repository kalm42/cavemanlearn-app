# Test Preparation Platform - Implementation Plan Overview

## Executive Summary

This document outlines a comprehensive phased implementation plan for building a Test Preparation Platform MVP. The platform connects content publishers with learners preparing for exams, certifications, or assessments through subscription-based question banks.

This implementation plan is split into multiple focused documents:

- **00-overview.md** (this file) - Overview, codebase state, and quality requirements
- **01-phase-1-user-profiles.md** - User profiles and organization foundation
- **02-phase-2-content-management.md** - Question decks and content management
- **03-phase-3-marketplace.md** - Marketplace and subscriptions
- **04-phase-4-practice-sessions.md** - Practice sessions and performance tracking
- **05-phase-5-analytics.md** - Publisher analytics and question reporting
- **06-infrastructure.md** - Environment variables, dependencies, directory structure, and authorization

---

## Current Codebase State

### Existing Infrastructure

- **Framework**: TanStack Start with React 19, React Compiler, SSR support
- **Authentication**: Clerk (fully integrated)
- **Database**: Drizzle ORM with PostgreSQL (only demo `todos` table exists)
- **Data Fetching**: TanStack Query with SSR integration
- **i18n**: ParaglideJS (en, de locales)
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest + React Testing Library + MSW + Playwright

### Key Patterns to Follow

- Server functions via `createServerFn` (see `/src/routes/demo/drizzle.tsx`)
- API routes via `createFileRoute` with `server.handlers` (see `/src/routes/demo/api.tq-todos.ts`)
- Type-safe env vars via T3 Env (`/src/env.ts`)
- Integrations in `/src/integrations/` directory
- Pure functional style, one function/concern per file

---

## Code Quality Requirements

### Coverage Targets

- **End of Phase 1**: Minimum 50% code coverage (enforced)
- **End of Phase 2**: Minimum 70% code coverage (enforced)
- **Phases 3-5**: Maintain minimum 70% code coverage

### CI/CD Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm typecheck

      - name: Lint
        run: pnpm lint

      - name: Run tests with coverage
        run: pnpm test --coverage
        env:
          # Add required env vars for tests
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Check coverage threshold
        run: |
          # Extract coverage percentage and fail if below threshold
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          THRESHOLD=50  # Update to 70 after Phase 2
          if (( $(echo "$COVERAGE < $THRESHOLD" | bc -l) )); then
            echo "Coverage $COVERAGE% is below threshold $THRESHOLD%"
            exit 1
          fi

      - name: Build
        run: pnpm build
```

Update `vitest.config.ts` to enforce coverage:

```typescript
export default defineConfig({
	test: {
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary', 'html'],
			thresholds: {
				lines: 50, // Update to 70 after Phase 2
				functions: 50,
				branches: 50,
				statements: 50,
			},
		},
	},
})
```

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
