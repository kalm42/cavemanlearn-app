# E2E Testing with Clerk Authentication

This document explains the e2e testing architecture for authenticated flows using Clerk and Playwright, the problems we encountered, and how we solved them.

## Table of Contents

1. [The Problem](#the-problem)
2. [Root Causes](#root-causes)
3. [The Solution](#the-solution)
4. [Architecture Overview](#architecture-overview)
5. [Why This Solution Works](#why-this-solution-works)
6. [Key Implementation Details](#key-implementation-details)
7. [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)

---

## The Problem

Our e2e tests for publisher organization flows were failing with `401 Unauthorized` errors when making API calls, even though:

1. The user appeared to be signed in (avatar visible in the UI)
2. Clerk's session cookies were present
3. The global setup successfully authenticated the user

The tests would navigate to `/publisher/organizations` and see a "Loading..." state that never resolved, eventually showing "Failed to fetch profile: 401".

### Original Test Issues

The original test file had several architectural problems:

1. **Serial mode with inter-test dependencies** - Test 3 expected to find an organization created in Test 2
2. **Defensive programming** - Tests checked for "access denied" because user state was unknown
3. **Flaky tests** - No control over database state meant tests could fail randomly
4. **Mocking internal APIs** - Some tests mocked `/api/user/profile` which violates the principle of testing the full stack

---

## Root Causes

After extensive debugging, we identified two distinct root causes:

### 1. Environment Variable Access in Server-Side Code

The `src/lib/auth.ts` file was using:

```typescript
import { env } from '@/env'
const secretKey = env.CLERK_SECRET_KEY
```

The `env` module uses `import.meta.env` as its runtime environment source. In Vite:

- **Client-side**: Only `VITE_*` prefixed variables are available via `import.meta.env`
- **Server-side**: The behavior varies depending on the SSR configuration

For TanStack Start's server-side API handlers, `import.meta.env.CLERK_SECRET_KEY` was `undefined`, causing all token verification to fail silently.

**Evidence**: The database connection (`src/db/index.ts`) uses `process.env.DATABASE_URL` directly and works correctly.

### 2. Clerk JWT Token Structure

Even after fixing the environment variable issue, authentication still failed. The debug logs revealed:

```
[Auth] Missing userId or email in token payload. userId: user_38SNam5lZ3uTZ4GZETxk4fKfYXF email: undefined
```

The original code required both `userId` AND `email` from the JWT payload:

```typescript
const userId = payload.sub
const email = z.email().optional().parse(payload.email)

if (!userId || !email) {
	return null // This was failing!
}
```

**Key insight**: Clerk's JWT tokens include `sub` (the user ID) but don't always include the `email` claim in the standard payload. The email might be:

- In a nested claims object
- Not included at all (depending on Clerk configuration)
- Available only via a separate API call

---

## The Solution

### 1. Database Seeding Utility

Created `src/test/e2e-seed.ts` with functions to:

- **`seedPublisherUser(pool, { clerkId, email })`** - Upserts a user profile as a publisher
- **`cleanupTestOrganizations(pool)`** - Removes organizations with "E2E Test" prefix
- **`createE2ePool()`** - Creates a database connection for seeding

### 2. Global Setup Enhancement

Updated `src/test/global.setup.ts` to:

1. Initialize Clerk testing with `clerkSetup()` (obtains Testing Token)
2. Authenticate and save session state
3. **New**: Seed the database with the test user as a publisher

```typescript
setup('seed database for e2e tests', async () => {
	const email = process.env.E2E_CLERK_USER_USERNAME
	const secretKey = process.env.CLERK_SECRET_KEY

	// Look up the Clerk user ID from the email
	const clerkClient = createClerkClient({ secretKey })
	const users = await clerkClient.users.getUserList({ emailAddress: [email] })
	const clerkId = users.data[0].id

	const pool = createE2ePool()
	try {
		await cleanupTestOrganizations(pool)
		await seedPublisherUser(pool, { clerkId, email })
	} finally {
		await pool.end()
	}
})
```

### 3. Auth Module Fix

Updated `src/lib/auth.ts`:

```typescript
// Use process.env directly for server-side variables
const secretKey = process.env.CLERK_SECRET_KEY

// Make email optional - it may not be in the token
const email = z.email().optional().parse(payload.email) ?? ''

// Only require userId
if (!userId) {
	return null
}

return { userId, email }
```

### 4. Simplified Test File

The new `e2e/publisher-organizations.spec.ts`:

- Uses stored auth state from global setup
- No defensive checks needed (setup guarantees publisher role)
- Tests are independent (can run in any order)
- Uses "E2E Test" prefix for easy cleanup identification

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Test Execution Flow                         │
└─────────────────────────────────────────────────────────────────┘

1. Global Setup (runs once)
   ├── clerkSetup() ──────────────► Obtains Testing Token
   ├── clerk.signIn() ────────────► Authenticates test user
   ├── storageState() ────────────► Saves session to file
   └── seedDatabase() ────────────► Seeds user as publisher

2. Test Execution (per test)
   ├── Load storageState ─────────► Restores session cookies
   ├── Navigate to page ──────────► Browser makes requests
   │   └── Frontend getToken() ───► Gets JWT from Clerk
   │       └── API Request ───────► Sends JWT in Authorization header
   │           └── Backend verifyToken() ──► Validates with CLERK_SECRET_KEY
   └── Assert results

3. Cleanup
   └── cleanupTestOrganizations() ► Removes "E2E Test*" orgs
```

---

## Why This Solution Works

### 1. Full Stack Testing

Unlike the previous approach that mocked internal APIs, this solution tests the complete flow:

- **Frontend** → Clerk authentication → `getToken()` → API request
- **Backend** → Token verification → Database query → Response
- **Database** → Real data, real queries, real constraints

This catches integration issues that mocking would hide.

### 2. Deterministic State

By seeding the database in global setup:

- Tests always start with a known state (user is a publisher)
- No "access denied" checks needed
- Tests don't depend on each other
- Cleanup ensures fresh state for next run

### 3. Testing Token Enables Real Auth

Clerk's `clerkSetup()` obtains a Testing Token that:

- Bypasses bot detection (which would block automated tests)
- Allows `getToken()` to refresh expired JWTs
- Works with stored session state

Without the Testing Token, Clerk would block the automated requests as suspicious activity.

### 4. Correct Environment Variable Access

Using `process.env.CLERK_SECRET_KEY` directly:

- Works reliably in Node.js server-side contexts
- Matches how database URL is accessed (proven pattern)
- Avoids Vite's `import.meta.env` complexity

### 5. Graceful Email Handling

Making email optional in token verification:

- Matches Clerk's actual JWT structure
- Doesn't break auth when email isn't in the token
- Email can be fetched from user profile if needed

---

## Key Implementation Details

### Environment Variables Required

```bash
# .env.local
E2E_CLERK_USER_USERNAME=test@example.com  # Email of test user
E2E_CLERK_USER_PASSWORD=***               # Password for test user
CLERK_SECRET_KEY=sk_test_***              # For token verification
DATABASE_URL=postgresql://...             # Database connection
```

### Test User Requirements

The test user must:

1. Exist in your Clerk dashboard
2. Have password authentication enabled
3. Use credentials that match your environment variables

### Playwright Configuration

```typescript
// playwright.config.ts
projects: [
	{
		name: 'setup',
		testMatch: /global\.setup\.ts/,
		testDir: './src/test',
	},
	{
		name: 'chromium',
		use: {
			storageState: 'playwright/.clerk/user.json', // Load saved session
		},
		dependencies: ['setup'], // Run setup first
	},
	// ... other browsers
]
```

### Organization Naming Convention

Tests create organizations with names like:

```typescript
const orgName = `E2E Test Org ${String(Date.now())}`
```

This allows:

- Unique names per test run (no conflicts)
- Easy identification of test data
- Simple cleanup with `WHERE name LIKE 'E2E Test%'`

---

## Common Pitfalls to Avoid

### 1. Don't Clear Storage State

```typescript
// DON'T DO THIS
test.use({ storageState: { cookies: [], origins: [] } })
```

This clears Clerk's session and Testing Token, breaking authentication.

### 2. Don't Mock Internal APIs

```typescript
// DON'T DO THIS for full-stack e2e tests
await page.route('**/api/user/profile', async (route) => {
	await route.fulfill({ status: 200, body: mockProfile })
})
```

This defeats the purpose of e2e testing. Only mock external services (Stripe, PostHog, etc.).

### 3. Don't Require Email in Token Verification

```typescript
// DON'T DO THIS
if (!userId || !email) {
	return null
}
```

Clerk tokens may not include email. Check only for `userId`.

### 4. Don't Use `import.meta.env` for Server Secrets

```typescript
// DON'T DO THIS
const secretKey = import.meta.env.CLERK_SECRET_KEY

// DO THIS
const secretKey = process.env.CLERK_SECRET_KEY
```

### 5. Don't Depend on Test Order

```typescript
// DON'T DO THIS
test.describe.configure({ mode: 'serial' })

test('create org', async ({ page }) => {
	/* creates org */
})
test('view org', async ({ page }) => {
	/* expects org from previous test */
})
```

Each test should be independent. Seed required data in setup.

---

## References

- [Clerk Testing Documentation](https://clerk.com/docs/guides/development/testing/playwright/overview)
- [Playwright Storage State](https://playwright.dev/docs/auth)
- [@clerk/testing Package](https://www.npmjs.com/package/@clerk/testing)
