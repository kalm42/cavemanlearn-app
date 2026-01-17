# Test Preparation Platform - Implementation Plan

## Executive Summary

This document outlines a comprehensive phased implementation plan for building a Test Preparation Platform MVP. The platform connects content publishers with learners preparing for exams, certifications, or assessments through subscription-based question banks.

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
          node-version: "24"
          cache: "pnpm"

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
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      thresholds: {
        lines: 50, // Update to 70 after Phase 2
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
  },
});
```

---

## Implementation Phases

### Phase 1: User Profiles and Organization Foundation

**Goal**: Establish user identity, roles, and organization structure.

**Coverage Target**: 50% minimum by end of phase.

---

#### Phase 1.1: CI/CD Setup

**Goal**: Establish automated quality gates before writing feature code.

##### Tasks

1. **Create GitHub Actions workflow**
   - Create `.github/workflows/ci.yml`
   - Configure jobs: typecheck, lint, test, build
   - Set up coverage reporting

2. **Update Vitest configuration**
   - Add coverage thresholds to `vitest.config.ts`
   - Configure coverage reporters (text, json-summary, html)
   - Set initial threshold at 50%

3. **Verify pipeline**
   - Push changes and confirm workflow runs
   - Ensure all checks pass on main branch

##### Files to Create/Modify

- `.github/workflows/ci.yml` (create)
- `vitest.config.ts` (modify)

##### Testing

- Verify workflow triggers on push and PR
- Verify all jobs complete successfully

---

#### Phase 1.2: Database Schema - User Profiles

**Goal**: Create the user profiles table linked to Clerk authentication.

##### Database Schema

```typescript
// /src/db/schema.ts

export const userProfiles = pgTable("user_profiles", {
  id: uuid().primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text().notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  userType: text("user_type", { enum: ["learner", "publisher"] })
    .notNull()
    .default("learner"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

##### Tasks

1. **Add userProfiles table to schema**
   - Define table in `/src/db/schema.ts`
   - Export table and inferred types

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push` to apply

3. **Create type exports**
   - Export `UserProfile` type
   - Export `NewUserProfile` insert type
   - Export `UserType` enum type

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types are correct
- Unit test: Verify enum values

---

#### Phase 1.3: User Profile API - Read/Create

**Goal**: API endpoints for getting and creating user profiles.

##### API Endpoints

| Endpoint            | Method | Purpose                     |
| ------------------- | ------ | --------------------------- |
| `/api/user/profile` | GET    | Get current user's profile  |
| `/api/user/profile` | POST   | Create profile for new user |

##### Tasks

1. **Create getCurrentUser helper**
   - Create `/src/lib/auth.ts`
   - Function to get Clerk user from request
   - Function to get or create user profile from database

2. **Create GET /api/user/profile endpoint**
   - Create `/src/routes/api.user.profile.ts`
   - Return 401 if not authenticated
   - Return 404 if profile doesn't exist
   - Return profile data if exists

3. **Create POST /api/user/profile endpoint**
   - Validate request body (userType required)
   - Check user is authenticated
   - Check profile doesn't already exist
   - Create profile and return it

##### Files to Create/Modify

- `/src/lib/auth.ts` (create)
- `/src/routes/api.user.profile.ts` (create)

##### Testing

- Unit test: getCurrentUser returns null when not authenticated
- Unit test: getCurrentUser returns user when authenticated
- Unit test: GET returns 401 when not authenticated
- Unit test: GET returns 404 when profile doesn't exist
- Unit test: GET returns profile when exists
- Unit test: POST creates profile successfully
- Unit test: POST returns 409 when profile already exists
- MSW handlers for Clerk auth

---

#### Phase 1.4: User Profile API - Update

**Goal**: API endpoint for updating user profiles.

##### API Endpoints

| Endpoint            | Method | Purpose                       |
| ------------------- | ------ | ----------------------------- |
| `/api/user/profile` | PUT    | Update current user's profile |

##### Tasks

1. **Create PUT /api/user/profile endpoint**
   - Validate request body (displayName, avatarUrl optional)
   - Check user is authenticated
   - Check profile exists
   - Update profile and return it
   - Update `updatedAt` timestamp

2. **Create validation schemas**
   - Create `/src/lib/validation/user.ts`
   - Define Zod schema for profile update

##### Files to Create/Modify

- `/src/routes/api.user.profile.ts` (modify)
- `/src/lib/validation/user.ts` (create)

##### Testing

- Unit test: PUT returns 401 when not authenticated
- Unit test: PUT returns 404 when profile doesn't exist
- Unit test: PUT updates profile successfully
- Unit test: PUT validates input correctly

---

#### Phase 1.5: Clerk Webhook Integration

**Goal**: Automatically sync user data when Clerk events occur.

##### API Endpoints

| Endpoint              | Method | Purpose                     |
| --------------------- | ------ | --------------------------- |
| `/api/webhooks/clerk` | POST   | Handle Clerk webhook events |

##### Tasks

1. **Add Clerk webhook secret to env**
   - Update `/src/env.ts` with CLERK_WEBHOOK_SECRET

2. **Create webhook handler**
   - Create `/src/routes/api.webhooks.clerk.ts`
   - Verify webhook signature using Svix
   - Handle `user.created` event - create profile if not exists
   - Handle `user.updated` event - update email/avatar if changed
   - Handle `user.deleted` event - soft delete or cleanup

3. **Install Svix for webhook verification**
   - Add `svix` package for signature verification

##### Files to Create/Modify

- `/src/env.ts` (modify)
- `/src/routes/api.webhooks.clerk.ts` (create)

##### Dependencies

```bash
pnpm add svix
```

##### Testing

- Unit test: Webhook rejects invalid signatures
- Unit test: Webhook handles user.created event
- Unit test: Webhook handles user.updated event
- Unit test: Webhook handles user.deleted event
- Unit test: Webhook ignores unknown events

---

#### Phase 1.6: Onboarding UI

**Goal**: New user onboarding flow to choose learner or publisher role.

##### UI Routes

| Route         | Purpose                               |
| ------------- | ------------------------------------- |
| `/onboarding` | New user selects learner or publisher |

##### Tasks

1. **Create onboarding route**
   - Create `/src/routes/onboarding.tsx`
   - Check if user already has profile, redirect if so
   - Display choice: "I want to learn" vs "I want to publish"
   - On selection, POST to create profile
   - Redirect to appropriate dashboard

2. **Create OnboardingForm component**
   - Create `/src/components/user/OnboardingForm.tsx`
   - Two card options for learner/publisher
   - Clear descriptions of each path
   - Submit button

3. **Update root layout to check onboarding**
   - Modify `/src/routes/__root.tsx`
   - If authenticated but no profile, redirect to /onboarding

##### Files to Create/Modify

- `/src/routes/onboarding.tsx` (create)
- `/src/components/user/OnboardingForm.tsx` (create)
- `/src/routes/__root.tsx` (modify)

##### Testing

- Unit test: OnboardingForm renders both options
- Unit test: OnboardingForm calls onSubmit with correct type
- E2E test: New user completes onboarding as learner
- E2E test: New user completes onboarding as publisher

---

#### Phase 1.7: Profile Settings UI

**Goal**: Allow users to view and edit their profile.

##### UI Routes

| Route               | Purpose               |
| ------------------- | --------------------- |
| `/settings/profile` | View and edit profile |

##### Tasks

1. **Create settings layout**
   - Create `/src/routes/settings.tsx` (layout)
   - Sidebar with settings navigation
   - Require authentication

2. **Create profile settings page**
   - Create `/src/routes/settings/profile.tsx`
   - Display current profile info
   - Form to update displayName
   - Show email (read-only, from Clerk)
   - Show avatar (from Clerk)

3. **Create ProfileForm component**
   - Create `/src/components/user/ProfileForm.tsx`
   - Input for display name
   - Save button with loading state
   - Success/error feedback

##### Files to Create/Modify

- `/src/routes/settings.tsx` (create)
- `/src/routes/settings/profile.tsx` (create)
- `/src/components/user/ProfileForm.tsx` (create)

##### Testing

- Unit test: ProfileForm renders with initial values
- Unit test: ProfileForm validates input
- Unit test: ProfileForm submits correctly
- E2E test: User updates display name

---

#### Phase 1.8: Database Schema - Organizations

**Goal**: Create organizations and membership tables.

##### Database Schema

```typescript
// /src/db/schema.ts

export const organizations = pgTable("organizations", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  description: text(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => userProfiles.id, { onDelete: "cascade" })
      .notNull(),
    role: text({
      enum: ["owner", "admin", "editor", "writer", "viewer"],
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueMember: unique().on(table.organizationId, table.userId),
  }),
);
```

##### Tasks

1. **Add organizations table to schema**
   - Define table in `/src/db/schema.ts`
   - Add slug generation utility

2. **Add organizationMembers table to schema**
   - Define junction table with role enum
   - Add unique constraint on org + user

3. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

4. **Create type exports**
   - Export `Organization`, `NewOrganization` types
   - Export `OrganizationMember`, `NewOrganizationMember` types
   - Export `OrgRole` enum type

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types
- Unit test: Verify role enum values

---

#### Phase 1.9: Permissions System

**Goal**: Create authorization helpers for role-based access control.

##### Tasks

1. **Create permissions module**
   - Create `/src/lib/permissions.ts`
   - Define role hierarchy
   - Create permission check functions

2. **Permission functions to implement**
   - `canEditDeck(role)` - owner, admin, editor, writer
   - `canPublishDeck(role)` - owner, admin, editor
   - `canApproveQuestion(role)` - owner, admin, editor
   - `canManageMembers(role)` - owner, admin
   - `canManageBilling(role)` - owner only
   - `canDeleteOrganization(role)` - owner only

3. **Create organization access helper**
   - `getUserOrgRole(userId, orgId)` - get user's role in org
   - `requireOrgRole(userId, orgId, minRole)` - throw if insufficient

##### Files to Create/Modify

- `/src/lib/permissions.ts` (create)

##### Testing

- Unit test: Each permission function with all roles
- Unit test: getUserOrgRole returns correct role
- Unit test: getUserOrgRole returns null for non-members
- Unit test: requireOrgRole throws for insufficient role

---

#### Phase 1.10: Organization API - List/Create

**Goal**: API endpoints for listing and creating organizations.

##### API Endpoints

| Endpoint             | Method | Purpose                   |
| -------------------- | ------ | ------------------------- |
| `/api/organizations` | GET    | List user's organizations |
| `/api/organizations` | POST   | Create new organization   |

##### Tasks

1. **Create GET /api/organizations endpoint**
   - Create `/src/routes/api.organizations.ts`
   - Return orgs where user is a member
   - Include user's role in each org
   - Order by name

2. **Create POST /api/organizations endpoint**
   - Validate request body (name required)
   - Generate unique slug from name
   - Create organization
   - Add current user as owner
   - Return created org

3. **Create slug generation utility**
   - Create `/src/lib/slug.ts`
   - Convert name to URL-safe slug
   - Handle duplicates by appending number

4. **Create validation schemas**
   - Create `/src/lib/validation/organization.ts`
   - Define Zod schema for org creation

##### Files to Create/Modify

- `/src/routes/api.organizations.ts` (create)
- `/src/lib/slug.ts` (create)
- `/src/lib/validation/organization.ts` (create)

##### Testing

- Unit test: GET returns empty array for user with no orgs
- Unit test: GET returns orgs with roles
- Unit test: POST creates org successfully
- Unit test: POST makes creator the owner
- Unit test: POST validates input
- Unit test: Slug generation handles special characters
- Unit test: Slug generation handles duplicates

---

#### Phase 1.11: Organization API - Read/Update/Delete

**Goal**: API endpoints for single organization operations.

##### API Endpoints

| Endpoint                    | Method | Purpose                  |
| --------------------------- | ------ | ------------------------ |
| `/api/organizations/:orgId` | GET    | Get organization details |
| `/api/organizations/:orgId` | PUT    | Update organization      |
| `/api/organizations/:orgId` | DELETE | Delete organization      |

##### Tasks

1. **Create GET /api/organizations/:orgId endpoint**
   - Create `/src/routes/api.organizations.$orgId.ts`
   - Verify user is member of org
   - Return org details with member count

2. **Create PUT /api/organizations/:orgId endpoint**
   - Verify user has admin+ role
   - Validate request body
   - Update name/description/logo
   - Regenerate slug if name changes

3. **Create DELETE /api/organizations/:orgId endpoint**
   - Verify user is owner
   - Delete organization (cascades to members)

##### Files to Create/Modify

- `/src/routes/api.organizations.$orgId.ts` (create)

##### Testing

- Unit test: GET returns 403 for non-members
- Unit test: GET returns org details for members
- Unit test: PUT returns 403 for insufficient role
- Unit test: PUT updates org successfully
- Unit test: DELETE returns 403 for non-owners
- Unit test: DELETE deletes org successfully

---

#### Phase 1.12: Organization Members API

**Goal**: API endpoints for managing organization members.

##### API Endpoints

| Endpoint                                      | Method | Purpose            |
| --------------------------------------------- | ------ | ------------------ |
| `/api/organizations/:orgId/members`           | GET    | List members       |
| `/api/organizations/:orgId/members`           | POST   | Add member         |
| `/api/organizations/:orgId/members/:memberId` | PUT    | Update member role |
| `/api/organizations/:orgId/members/:memberId` | DELETE | Remove member      |

##### Tasks

1. **Create GET /api/organizations/:orgId/members endpoint**
   - Create `/src/routes/api.organizations.$orgId.members.ts`
   - Verify user is member
   - Return all members with profiles and roles

2. **Create POST /api/organizations/:orgId/members endpoint**
   - Verify user has admin+ role
   - Validate email and role
   - Find user by email
   - Add as member with specified role
   - Cannot add as owner (only one owner)

3. **Create member-specific routes**
   - Create `/src/routes/api.organizations.$orgId.members.$memberId.ts`
   - PUT: Update role (admin+ required, cannot change owner)
   - DELETE: Remove member (admin+ required, cannot remove owner)

##### Files to Create/Modify

- `/src/routes/api.organizations.$orgId.members.ts` (create)
- `/src/routes/api.organizations.$orgId.members.$memberId.ts` (create)

##### Testing

- Unit test: GET returns all members
- Unit test: POST adds member successfully
- Unit test: POST rejects duplicate members
- Unit test: POST rejects owner role
- Unit test: PUT updates role successfully
- Unit test: PUT cannot change owner role
- Unit test: DELETE removes member
- Unit test: DELETE cannot remove owner

---

#### Phase 1.13: Organizations UI - List

**Goal**: Publisher dashboard showing their organizations.

##### UI Routes

| Route                      | Purpose            |
| -------------------------- | ------------------ |
| `/publisher/organizations` | List organizations |

##### Tasks

1. **Create publisher layout**
   - Create `/src/routes/publisher.tsx` (layout)
   - Sidebar navigation for publisher area
   - Require publisher user type

2. **Create organizations list page**
   - Create `/src/routes/publisher/organizations/index.tsx`
   - List all organizations user belongs to
   - Show role badge for each
   - "Create Organization" button

3. **Create OrganizationCard component**
   - Create `/src/components/organization/OrganizationCard.tsx`
   - Display name, description, member count
   - Show user's role badge
   - Link to organization dashboard

##### Files to Create/Modify

- `/src/routes/publisher.tsx` (create)
- `/src/routes/publisher/organizations/index.tsx` (create)
- `/src/components/organization/OrganizationCard.tsx` (create)

##### Testing

- Unit test: OrganizationCard renders correctly
- Unit test: OrganizationCard shows correct role badge
- E2E test: Publisher sees their organizations

---

#### Phase 1.14: Organizations UI - Create

**Goal**: Form to create a new organization.

##### UI Routes

| Route                          | Purpose                  |
| ------------------------------ | ------------------------ |
| `/publisher/organizations/new` | Create organization form |

##### Tasks

1. **Create organization creation page**
   - Create `/src/routes/publisher/organizations/new.tsx`
   - Form with name and description
   - Preview generated slug
   - Submit creates org and redirects

2. **Create OrganizationForm component**
   - Create `/src/components/organization/OrganizationForm.tsx`
   - Name input (required)
   - Description textarea (optional)
   - Logo upload (optional, Phase 2)
   - Slug preview (auto-generated)

##### Files to Create/Modify

- `/src/routes/publisher/organizations/new.tsx` (create)
- `/src/components/organization/OrganizationForm.tsx` (create)

##### Testing

- Unit test: OrganizationForm validates name required
- Unit test: OrganizationForm shows slug preview
- E2E test: Publisher creates new organization

---

#### Phase 1.15: Organizations UI - Dashboard & Settings

**Goal**: Organization dashboard and settings page.

##### UI Routes

| Route                                      | Purpose                |
| ------------------------------------------ | ---------------------- |
| `/publisher/organizations/:orgId`          | Organization dashboard |
| `/publisher/organizations/:orgId/settings` | Organization settings  |

##### Tasks

1. **Create organization layout**
   - Create `/src/routes/publisher/organizations/$orgId.tsx` (layout)
   - Verify user is member
   - Tabs: Dashboard, Members, Settings (if admin+)

2. **Create organization dashboard**
   - Create `/src/routes/publisher/organizations/$orgId/index.tsx`
   - Show organization name and description
   - Quick stats (member count, deck count - 0 for now)
   - Quick actions based on role

3. **Create organization settings**
   - Create `/src/routes/publisher/organizations/$orgId/settings.tsx`
   - Require admin+ role
   - Edit name, description
   - Danger zone: delete organization (owner only)

##### Files to Create/Modify

- `/src/routes/publisher/organizations/$orgId.tsx` (create)
- `/src/routes/publisher/organizations/$orgId/index.tsx` (create)
- `/src/routes/publisher/organizations/$orgId/settings.tsx` (create)

##### Testing

- Unit test: Dashboard shows correct info
- Unit test: Settings hidden for non-admins
- E2E test: Admin updates organization name
- E2E test: Owner deletes organization

---

#### Phase 1.16: Organizations UI - Members

**Goal**: Member management interface.

##### UI Routes

| Route                                     | Purpose        |
| ----------------------------------------- | -------------- |
| `/publisher/organizations/:orgId/members` | Manage members |

##### Tasks

1. **Create members page**
   - Create `/src/routes/publisher/organizations/$orgId/members.tsx`
   - List all members with roles
   - "Add Member" button (admin+ only)
   - Edit role dropdown (admin+ only)
   - Remove button (admin+ only, not for owner)

2. **Create MemberList component**
   - Create `/src/components/organization/MemberList.tsx`
   - Table/list of members
   - Avatar, name, email, role
   - Action buttons based on permissions

3. **Create AddMemberModal component**
   - Create `/src/components/organization/AddMemberModal.tsx`
   - Email input to find user
   - Role selector (not owner)
   - Confirm button

4. **Create RoleSelector component**
   - Create `/src/components/organization/RoleSelector.tsx`
   - Dropdown with available roles
   - Disabled for owner role

##### Files to Create/Modify

- `/src/routes/publisher/organizations/$orgId/members.tsx` (create)
- `/src/components/organization/MemberList.tsx` (create)
- `/src/components/organization/AddMemberModal.tsx` (create)
- `/src/components/organization/RoleSelector.tsx` (create)

##### Testing

- Unit test: MemberList renders all members
- Unit test: MemberList hides actions for viewers
- Unit test: AddMemberModal validates email
- Unit test: RoleSelector excludes owner
- E2E test: Admin adds new member
- E2E test: Admin changes member role
- E2E test: Admin removes member

---

#### Phase 1.17: Navigation Updates

**Goal**: Update app navigation for learner/publisher paths.

##### Tasks

1. **Update root navigation**
   - Modify header/nav component
   - Show different nav items based on userType
   - Learner: Marketplace, My Library, Analytics
   - Publisher: Organizations, Decks, Analytics

2. **Create user menu**
   - Show user avatar and name
   - Dropdown: Settings, Sign Out
   - Switch role link (if applicable)

3. **Add breadcrumbs**
   - Create `/src/components/ui/Breadcrumbs.tsx`
   - Show current location in publisher area

##### Files to Create/Modify

- `/src/routes/__root.tsx` (modify)
- `/src/components/ui/Breadcrumbs.tsx` (create)

##### Testing

- Unit test: Nav shows correct items for learner
- Unit test: Nav shows correct items for publisher
- E2E test: Navigation works correctly

---

#### Phase 1 Verification Checklist

- [ ] CI/CD pipeline runs on all PRs
- [ ] All checks pass (typecheck, lint, test, build)
- [ ] Code coverage is at least 50%
- [ ] Create account and complete onboarding as learner
- [ ] Create account and complete onboarding as publisher
- [ ] Update profile display name
- [ ] Create organization
- [ ] Update organization name and description
- [ ] Add member to organization with writer role
- [ ] Change member role to editor
- [ ] Remove member from organization
- [ ] Delete organization (as owner)

---

### Phase 2: Question Decks and Content Management

**Goal**: Enable publishers to create and manage question decks with rich content.

**Coverage Target**: 70% minimum by end of phase.

**Note**: This platform targets professional certification exams (medical, legal, accounting, etc.), not software developers. The rich text editor supports formatted text, images, diagrams, tables, and mathematical equations - but NOT code blocks or syntax highlighting.

---

#### Phase 2.1: Database Schema - Decks

**Goal**: Create the decks table for question collections.

##### Database Schema

```typescript
// /src/db/schema.ts

export const decks = pgTable(
  "decks",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    title: text().notNull(),
    slug: text().notNull(),
    description: text(),
    coverImageUrl: text("cover_image_url"),
    status: text({ enum: ["draft", "published", "archived"] })
      .notNull()
      .default("draft"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueSlug: unique().on(table.organizationId, table.slug),
  }),
);
```

##### Tasks

1. **Add decks table to schema**
   - Define table in `/src/db/schema.ts`
   - Add foreign key to organizations
   - Add unique constraint on org + slug

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `Deck`, `NewDeck` types
   - Export `DeckStatus` enum type

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types are correct
- Unit test: Verify status enum values

---

#### Phase 2.2: Database Schema - Topics

**Goal**: Create the topics table for organizing questions within decks.

##### Database Schema

```typescript
export const topics = pgTable("topics", {
  id: uuid().primaryKey().defaultRandom(),
  deckId: uuid("deck_id")
    .references(() => decks.id, { onDelete: "cascade" })
    .notNull(),
  name: text().notNull(),
  description: text(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
```

##### Tasks

1. **Add topics table to schema**
   - Define table in `/src/db/schema.ts`
   - Add cascade delete when deck is deleted

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `Topic`, `NewTopic` types

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types
- Unit test: Verify cascade delete behavior

---

#### Phase 2.3: Database Schema - Questions and Answer Options

**Goal**: Create tables for questions and their answer options.

##### Database Schema

```typescript
export const questions = pgTable("questions", {
  id: uuid().primaryKey().defaultRandom(),
  deckId: uuid("deck_id")
    .references(() => decks.id, { onDelete: "cascade" })
    .notNull(),
  topicId: uuid("topic_id").references(() => topics.id, {
    onDelete: "set null",
  }),
  questionType: text("question_type", {
    enum: ["multiple_choice", "multiple_select", "true_false"],
  }).notNull(),
  content: jsonb().notNull(), // TipTap JSON format
  explanation: jsonb(),
  status: text({ enum: ["draft", "review", "approved", "archived"] })
    .notNull()
    .default("draft"),
  createdBy: uuid("created_by")
    .references(() => userProfiles.id)
    .notNull(),
  approvedBy: uuid("approved_by").references(() => userProfiles.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const answerOptions = pgTable("answer_options", {
  id: uuid().primaryKey().defaultRandom(),
  questionId: uuid("question_id")
    .references(() => questions.id, { onDelete: "cascade" })
    .notNull(),
  content: jsonb().notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});
```

##### Tasks

1. **Add questions table to schema**
   - Define table with all fields
   - Content stored as JSONB (TipTap format)
   - Track creator and approver

2. **Add answerOptions table to schema**
   - Define table with cascade delete
   - Support multiple correct answers for multiple_select type

3. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

4. **Create type exports**
   - Export `Question`, `NewQuestion` types
   - Export `AnswerOption`, `NewAnswerOption` types
   - Export `QuestionType`, `QuestionStatus` enum types

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types
- Unit test: Verify question type enum values
- Unit test: Verify question status enum values

---

#### Phase 2.4: Database Schema - Media Assets

**Goal**: Create table for tracking uploaded media files.

##### Database Schema

```typescript
export const mediaAssets = pgTable("media_assets", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  filename: text().notNull(),
  url: text().notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  uploadedBy: uuid("uploaded_by")
    .references(() => userProfiles.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

##### Tasks

1. **Add mediaAssets table to schema**
   - Define table in `/src/db/schema.ts`
   - Track file metadata and uploader

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `MediaAsset`, `NewMediaAsset` types

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types

---

#### Phase 2.5: Cloudflare R2 Integration

**Goal**: Set up S3-compatible storage for media uploads.

##### Tasks

1. **Add R2 environment variables**
   - Update `/src/env.ts` with R2 config
   - Add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
   - Add R2_BUCKET_NAME, R2_PUBLIC_URL

2. **Install AWS S3 SDK**
   - Run `pnpm add @aws-sdk/client-s3`

3. **Create R2 client**
   - Create `/src/integrations/r2/client.ts`
   - Configure S3 client for R2 endpoint
   - Export helper functions for upload/delete

4. **Create upload utilities**
   - Create `/src/lib/upload.ts`
   - Generate unique filenames
   - Validate file types (images only)
   - Validate file size limits

##### Files to Create/Modify

- `/src/env.ts` (modify)
- `/src/integrations/r2/client.ts` (create)
- `/src/lib/upload.ts` (create)

##### Dependencies

```bash
pnpm add @aws-sdk/client-s3
```

##### Testing

- Unit test: Filename generation is unique
- Unit test: File type validation rejects non-images
- Unit test: File size validation enforces limits
- MSW: Mock S3 upload responses

---

#### Phase 2.6: Media Upload API

**Goal**: API endpoint for uploading images to R2.

##### API Endpoints

| Endpoint            | Method | Purpose           |
| ------------------- | ------ | ----------------- |
| `/api/media/upload` | POST   | Upload image file |

##### Tasks

1. **Create upload endpoint**
   - Create `/src/routes/api.media.upload.ts`
   - Accept multipart form data
   - Validate user is authenticated
   - Validate user belongs to specified org
   - Validate file type and size
   - Upload to R2
   - Create mediaAsset record
   - Return asset URL

2. **Create validation schema**
   - Create `/src/lib/validation/media.ts`
   - Define allowed MIME types
   - Define max file size (e.g., 5MB)

##### Files to Create/Modify

- `/src/routes/api.media.upload.ts` (create)
- `/src/lib/validation/media.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 when not org member
- Unit test: Returns 400 for invalid file type
- Unit test: Returns 400 for oversized file
- Unit test: Successfully uploads and returns URL
- MSW: Mock R2 upload

---

#### Phase 2.7: TipTap Editor Integration

**Goal**: Set up rich text editor with basic formatting.

##### Tasks

1. **Install TipTap packages**
   - Run installation command (see dependencies)

2. **Create TipTap configuration**
   - Create `/src/integrations/tiptap/extensions.ts`
   - Configure StarterKit (bold, italic, lists, headings)
   - Add Image extension
   - Add Table extensions
   - NO code block extension

3. **Create RichTextEditor component**
   - Create `/src/components/editor/RichTextEditor.tsx`
   - Accept content as TipTap JSON
   - Emit onChange with TipTap JSON
   - Toolbar with formatting buttons
   - Editable and read-only modes

4. **Create editor toolbar**
   - Create `/src/components/editor/EditorToolbar.tsx`
   - Bold, italic, underline buttons
   - Heading level selector
   - List buttons (bullet, numbered)
   - Image insert button
   - Table insert button
   - Equation insert button

##### Files to Create/Modify

- `/src/integrations/tiptap/extensions.ts` (create)
- `/src/components/editor/RichTextEditor.tsx` (create)
- `/src/components/editor/EditorToolbar.tsx` (create)

##### Dependencies

```bash
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-underline
```

##### Testing

- Unit test: Editor renders with initial content
- Unit test: Editor emits onChange on edit
- Unit test: Toolbar buttons toggle formatting
- Unit test: Read-only mode prevents editing

---

#### Phase 2.8: Image Upload in Editor

**Goal**: Enable image insertion in rich text editor.

##### Tasks

1. **Create ImageUploader component**
   - Create `/src/components/editor/ImageUploader.tsx`
   - File input with drag-and-drop
   - Preview before upload
   - Upload progress indicator
   - Call media upload API
   - Return URL on success

2. **Create image insert modal**
   - Create `/src/components/editor/ImageInsertModal.tsx`
   - Tab: Upload new image
   - Tab: Select from existing media assets
   - Insert button adds image to editor

3. **Integrate with TipTap**
   - Add image insert command to toolbar
   - Open modal on click
   - Insert image node with URL

##### Files to Create/Modify

- `/src/components/editor/ImageUploader.tsx` (create)
- `/src/components/editor/ImageInsertModal.tsx` (create)
- `/src/components/editor/EditorToolbar.tsx` (modify)

##### Testing

- Unit test: ImageUploader shows preview
- Unit test: ImageUploader calls upload API
- Unit test: Modal inserts image into editor
- E2E test: Upload and insert image

---

#### Phase 2.9: KaTeX Math Equation Support

**Goal**: Enable mathematical equation rendering and editing.

##### Tasks

1. **Install KaTeX**
   - Run `pnpm add katex @types/katex`

2. **Create custom TipTap extension for math**
   - Create `/src/integrations/tiptap/math-extension.ts`
   - Define math node type
   - Store LaTeX string in node
   - Render using KaTeX

3. **Create EquationEditor component**
   - Create `/src/components/editor/EquationEditor.tsx`
   - LaTeX input field
   - Live preview using KaTeX
   - Common symbol palette
   - Insert/update button

4. **Create equation insert modal**
   - Create `/src/components/editor/EquationModal.tsx`
   - Edit existing or create new
   - Preview rendered equation
   - Insert into editor

5. **Add KaTeX CSS**
   - Import KaTeX stylesheet in app

##### Files to Create/Modify

- `/src/integrations/tiptap/math-extension.ts` (create)
- `/src/components/editor/EquationEditor.tsx` (create)
- `/src/components/editor/EquationModal.tsx` (create)
- `/src/routes/__root.tsx` (modify - add KaTeX CSS)

##### Dependencies

```bash
pnpm add katex @types/katex
```

##### Testing

- Unit test: KaTeX renders valid LaTeX
- Unit test: KaTeX shows error for invalid LaTeX
- Unit test: Equation node stores LaTeX string
- Unit test: Modal inserts equation into editor

---

#### Phase 2.10: Table Support in Editor

**Goal**: Enable table creation and editing.

##### Tasks

1. **Configure table extensions**
   - Update `/src/integrations/tiptap/extensions.ts`
   - Add Table, TableRow, TableCell, TableHeader

2. **Create table toolbar**
   - Create `/src/components/editor/TableToolbar.tsx`
   - Add row/column buttons
   - Delete row/column buttons
   - Merge/split cells (if supported)
   - Delete table button

3. **Create table insert modal**
   - Create `/src/components/editor/TableInsertModal.tsx`
   - Row count input
   - Column count input
   - Header row checkbox
   - Insert button

4. **Style tables**
   - Add table CSS for borders and spacing
   - Ensure responsive on mobile

##### Files to Create/Modify

- `/src/integrations/tiptap/extensions.ts` (modify)
- `/src/components/editor/TableToolbar.tsx` (create)
- `/src/components/editor/TableInsertModal.tsx` (create)

##### Testing

- Unit test: Table inserts with correct dimensions
- Unit test: Add row/column works
- Unit test: Delete row/column works
- Unit test: Tables render correctly in read-only

---

#### Phase 2.11: Deck API - List/Create

**Goal**: API endpoints for listing and creating decks.

##### API Endpoints

| Endpoint     | Method | Purpose               |
| ------------ | ------ | --------------------- |
| `/api/decks` | GET    | List decks for an org |
| `/api/decks` | POST   | Create new deck       |

##### Tasks

1. **Create GET /api/decks endpoint**
   - Create `/src/routes/api.decks.ts`
   - Require orgId query parameter
   - Verify user is member of org
   - Return decks with question counts
   - Support status filter (draft, published, archived)

2. **Create POST /api/decks endpoint**
   - Validate request body (title, orgId required)
   - Verify user has edit permission in org
   - Generate unique slug from title
   - Create deck and return it

3. **Create validation schema**
   - Create `/src/lib/validation/deck.ts`
   - Define Zod schema for deck creation

##### Files to Create/Modify

- `/src/routes/api.decks.ts` (create)
- `/src/lib/validation/deck.ts` (create)

##### Testing

- Unit test: GET returns 400 without orgId
- Unit test: GET returns 403 for non-members
- Unit test: GET returns decks with counts
- Unit test: GET filters by status
- Unit test: POST creates deck successfully
- Unit test: POST generates unique slug
- Unit test: POST returns 403 for viewers

---

#### Phase 2.12: Deck API - Read/Update/Delete

**Goal**: API endpoints for single deck operations.

##### API Endpoints

| Endpoint             | Method | Purpose     |
| -------------------- | ------ | ----------- |
| `/api/decks/:deckId` | GET    | Get deck    |
| `/api/decks/:deckId` | PUT    | Update deck |
| `/api/decks/:deckId` | DELETE | Delete deck |

##### Tasks

1. **Create GET /api/decks/:deckId endpoint**
   - Create `/src/routes/api.decks.$deckId.ts`
   - Verify user is member of deck's org
   - Return deck with topics and question count

2. **Create PUT /api/decks/:deckId endpoint**
   - Verify user has edit permission
   - Validate request body
   - Update title/description/cover image
   - Regenerate slug if title changes

3. **Create DELETE /api/decks/:deckId endpoint**
   - Verify user has admin+ permission
   - Cannot delete published deck (must archive first)
   - Delete deck (cascades to topics, questions)

##### Files to Create/Modify

- `/src/routes/api.decks.$deckId.ts` (create)

##### Testing

- Unit test: GET returns 403 for non-members
- Unit test: GET returns deck with details
- Unit test: PUT updates deck successfully
- Unit test: PUT returns 403 for viewers
- Unit test: DELETE returns 403 for non-admins
- Unit test: DELETE fails for published deck
- Unit test: DELETE succeeds for draft deck

---

#### Phase 2.13: Deck Publish API

**Goal**: API endpoint for publishing a deck.

##### API Endpoints

| Endpoint                   | Method | Purpose      |
| -------------------------- | ------ | ------------ |
| `/api/decks/:deckId/publish` | POST   | Publish deck |

##### Tasks

1. **Create POST /api/decks/:deckId/publish endpoint**
   - Create `/src/routes/api.decks.$deckId.publish.ts`
   - Verify user has publish permission (editor+)
   - Validate deck has at least one approved question
   - Validate deck has at least one topic
   - Set status to published
   - Set publishedAt timestamp
   - Return updated deck

2. **Create unpublish/archive logic**
   - Add archive endpoint or status change
   - Archived decks hidden from marketplace
   - Existing subscribers retain access

##### Files to Create/Modify

- `/src/routes/api.decks.$deckId.publish.ts` (create)

##### Testing

- Unit test: Returns 403 for writers
- Unit test: Returns 400 if no approved questions
- Unit test: Returns 400 if no topics
- Unit test: Successfully publishes deck
- Unit test: Sets publishedAt timestamp

---

#### Phase 2.14: Topics API

**Goal**: API endpoints for managing topics within a deck.

##### API Endpoints

| Endpoint                           | Method | Purpose      |
| ---------------------------------- | ------ | ------------ |
| `/api/decks/:deckId/topics`        | GET    | List topics  |
| `/api/decks/:deckId/topics`        | POST   | Create topic |
| `/api/decks/:deckId/topics/:topicId` | PUT    | Update topic |
| `/api/decks/:deckId/topics/:topicId` | DELETE | Delete topic |

##### Tasks

1. **Create topics list/create endpoint**
   - Create `/src/routes/api.decks.$deckId.topics.ts`
   - GET: Return topics ordered by sortOrder
   - POST: Create topic with next sortOrder

2. **Create single topic endpoint**
   - Create `/src/routes/api.decks.$deckId.topics.$topicId.ts`
   - PUT: Update name, description, sortOrder
   - DELETE: Delete topic (questions set topicId to null)

3. **Create reorder endpoint**
   - Add PUT /api/decks/:deckId/topics/reorder
   - Accept array of topic IDs in new order
   - Update sortOrder for each

4. **Create validation schema**
   - Create `/src/lib/validation/topic.ts`
   - Define Zod schema for topic

##### Files to Create/Modify

- `/src/routes/api.decks.$deckId.topics.ts` (create)
- `/src/routes/api.decks.$deckId.topics.$topicId.ts` (create)
- `/src/routes/api.decks.$deckId.topics.reorder.ts` (create)
- `/src/lib/validation/topic.ts` (create)

##### Testing

- Unit test: GET returns topics in order
- Unit test: POST creates with correct sortOrder
- Unit test: PUT updates topic
- Unit test: DELETE removes topic
- Unit test: Reorder updates all sortOrders

---

#### Phase 2.15: Questions API - List/Create

**Goal**: API endpoints for listing and creating questions.

##### API Endpoints

| Endpoint                       | Method | Purpose          |
| ------------------------------ | ------ | ---------------- |
| `/api/decks/:deckId/questions` | GET    | List questions   |
| `/api/decks/:deckId/questions` | POST   | Create question  |

##### Tasks

1. **Create GET /api/decks/:deckId/questions endpoint**
   - Create `/src/routes/api.decks.$deckId.questions.ts`
   - Support filtering by topic, status
   - Support pagination
   - Include answer options in response
   - Return creator info

2. **Create POST /api/decks/:deckId/questions endpoint**
   - Validate request body
   - Verify user has edit permission
   - Create question with status=draft
   - Create answer options
   - Set createdBy to current user

3. **Create validation schema**
   - Create `/src/lib/validation/question.ts`
   - Validate question type
   - Validate content is valid TipTap JSON
   - Validate at least 2 answer options
   - Validate at least 1 correct answer
   - Validate multiple_select can have multiple correct

##### Files to Create/Modify

- `/src/routes/api.decks.$deckId.questions.ts` (create)
- `/src/lib/validation/question.ts` (create)

##### Testing

- Unit test: GET returns questions with options
- Unit test: GET filters by topic
- Unit test: GET filters by status
- Unit test: GET paginates correctly
- Unit test: POST creates question and options
- Unit test: POST validates correct answer exists
- Unit test: POST sets createdBy

---

#### Phase 2.16: Questions API - Read/Update/Delete

**Goal**: API endpoints for single question operations.

##### API Endpoints

| Endpoint                   | Method | Purpose         |
| -------------------------- | ------ | --------------- |
| `/api/questions/:questionId` | GET    | Get question    |
| `/api/questions/:questionId` | PUT    | Update question |
| `/api/questions/:questionId` | DELETE | Delete question |

##### Tasks

1. **Create GET /api/questions/:questionId endpoint**
   - Create `/src/routes/api.questions.$questionId.ts`
   - Verify user is member of question's deck's org
   - Return question with options, creator, approver

2. **Create PUT /api/questions/:questionId endpoint**
   - Verify user has edit permission
   - Validate request body
   - Update question content
   - Replace answer options (delete old, create new)
   - Reset status to draft if approved question is edited
   - Update updatedAt

3. **Create DELETE /api/questions/:questionId endpoint**
   - Verify user has edit permission
   - Delete question (cascades to options)

##### Files to Create/Modify

- `/src/routes/api.questions.$questionId.ts` (create)

##### Testing

- Unit test: GET returns 403 for non-members
- Unit test: GET returns question with all data
- Unit test: PUT updates question and options
- Unit test: PUT resets approved status on edit
- Unit test: DELETE removes question

---

#### Phase 2.17: Question Approval API

**Goal**: API endpoint for approving questions.

##### API Endpoints

| Endpoint                          | Method | Purpose          |
| --------------------------------- | ------ | ---------------- |
| `/api/questions/:questionId/approve` | POST   | Approve question |
| `/api/questions/:questionId/reject`  | POST   | Reject to draft  |

##### Tasks

1. **Create POST /api/questions/:questionId/approve endpoint**
   - Create `/src/routes/api.questions.$questionId.approve.ts`
   - Verify user has approve permission (editor+)
   - Question must be in review status
   - Set status to approved
   - Set approvedBy to current user
   - Set approvedAt timestamp

2. **Create POST /api/questions/:questionId/reject endpoint**
   - Create `/src/routes/api.questions.$questionId.reject.ts`
   - Verify user has approve permission
   - Set status back to draft
   - Clear approvedBy/approvedAt
   - Optionally include rejection reason (store in separate table or field)

3. **Create submit for review endpoint**
   - Add POST /api/questions/:questionId/submit
   - Writer submits question for review
   - Set status to review

##### Files to Create/Modify

- `/src/routes/api.questions.$questionId.approve.ts` (create)
- `/src/routes/api.questions.$questionId.reject.ts` (create)
- `/src/routes/api.questions.$questionId.submit.ts` (create)

##### Testing

- Unit test: Approve returns 403 for writers
- Unit test: Approve fails if not in review status
- Unit test: Approve sets all fields correctly
- Unit test: Reject resets status to draft
- Unit test: Submit sets status to review

---

#### Phase 2.18: Decks UI - List

**Goal**: Publisher page showing their organization's decks.

##### UI Routes

| Route                   | Purpose    |
| ----------------------- | ---------- |
| `/publisher/decks` | List decks |

##### Tasks

1. **Create decks list page**
   - Create `/src/routes/publisher/decks/index.tsx`
   - Select organization (if user belongs to multiple)
   - List decks as cards
   - Show status badge (draft/published/archived)
   - Show question count
   - "Create Deck" button
   - Filter by status

2. **Create DeckCard component**
   - Create `/src/components/deck/DeckCard.tsx`
   - Cover image thumbnail
   - Title and description
   - Status badge
   - Question count
   - Last updated date
   - Link to deck editor

##### Files to Create/Modify

- `/src/routes/publisher/decks/index.tsx` (create)
- `/src/components/deck/DeckCard.tsx` (create)

##### Testing

- Unit test: DeckCard renders all info
- Unit test: DeckCard shows correct status badge
- E2E test: Publisher sees their decks

---

#### Phase 2.19: Decks UI - Create

**Goal**: Form to create a new deck.

##### UI Routes

| Route                   | Purpose          |
| ----------------------- | ---------------- |
| `/publisher/decks/new` | Create deck form |

##### Tasks

1. **Create deck creation page**
   - Create `/src/routes/publisher/decks/new.tsx`
   - Select organization
   - Form with title, description
   - Cover image upload
   - Preview generated slug
   - Create button

2. **Create DeckForm component**
   - Create `/src/components/deck/DeckForm.tsx`
   - Title input (required)
   - Description textarea
   - Cover image uploader
   - Slug preview
   - Reusable for edit mode

##### Files to Create/Modify

- `/src/routes/publisher/decks/new.tsx` (create)
- `/src/components/deck/DeckForm.tsx` (create)

##### Testing

- Unit test: DeckForm validates title required
- Unit test: DeckForm shows slug preview
- Unit test: DeckForm handles image upload
- E2E test: Publisher creates new deck

---

#### Phase 2.20: Deck Editor Layout

**Goal**: Layout for editing a deck with navigation tabs.

##### UI Routes

| Route                        | Purpose            |
| ---------------------------- | ------------------ |
| `/publisher/decks/:deckId` | Deck editor layout |

##### Tasks

1. **Create deck editor layout**
   - Create `/src/routes/publisher/decks/$deckId.tsx`
   - Verify user has access to deck
   - Header with deck title and status
   - Tab navigation: Questions, Topics, Settings
   - Publish button (if editor+)
   - Outlet for child routes

2. **Create DeckHeader component**
   - Create `/src/components/deck/DeckHeader.tsx`
   - Deck title (editable inline?)
   - Status badge
   - Publish/unpublish button
   - Back to decks link

##### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId.tsx` (create)
- `/src/components/deck/DeckHeader.tsx` (create)

##### Testing

- Unit test: Layout shows correct tabs
- Unit test: Publish button hidden for writers
- E2E test: Navigate between tabs

---

#### Phase 2.21: Deck Settings UI

**Goal**: Settings page for deck metadata.

##### UI Routes

| Route                                 | Purpose       |
| ------------------------------------- | ------------- |
| `/publisher/decks/:deckId/settings` | Deck settings |

##### Tasks

1. **Create deck settings page**
   - Create `/src/routes/publisher/decks/$deckId/settings.tsx`
   - DeckForm in edit mode
   - Save button
   - Danger zone: archive/delete deck

2. **Add archive functionality**
   - Archive button (for published decks)
   - Delete button (for draft decks only)
   - Confirmation modal

##### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId/settings.tsx` (create)

##### Testing

- Unit test: Form pre-fills with deck data
- Unit test: Delete only shown for drafts
- Unit test: Archive only shown for published
- E2E test: Update deck title

---

#### Phase 2.22: Topics Management UI

**Goal**: Interface for managing deck topics.

##### UI Routes

| Route                               | Purpose          |
| ----------------------------------- | ---------------- |
| `/publisher/decks/:deckId/topics` | Topic management |

##### Tasks

1. **Create topics page**
   - Create `/src/routes/publisher/decks/$deckId/topics.tsx`
   - List topics with drag-and-drop reordering
   - Add topic button
   - Inline edit topic name
   - Delete topic button
   - Show question count per topic

2. **Create TopicList component**
   - Create `/src/components/deck/TopicList.tsx`
   - Draggable topic items
   - Edit/delete actions
   - Question count badge

3. **Create AddTopicForm component**
   - Create `/src/components/deck/AddTopicForm.tsx`
   - Inline form to add new topic
   - Name input
   - Optional description

##### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId/topics.tsx` (create)
- `/src/components/deck/TopicList.tsx` (create)
- `/src/components/deck/AddTopicForm.tsx` (create)

##### Testing

- Unit test: TopicList renders all topics
- Unit test: Drag and drop reorders topics
- Unit test: Delete removes topic
- E2E test: Add and reorder topics

---

#### Phase 2.23: Questions List UI

**Goal**: Interface for listing and managing questions.

##### UI Routes

| Route                                       | Purpose       |
| ------------------------------------------- | ------------- |
| `/publisher/decks/:deckId/questions` | Question list |

##### Tasks

1. **Create questions list page**
   - Create `/src/routes/publisher/decks/$deckId/questions/index.tsx`
   - List questions as cards
   - Filter by topic
   - Filter by status (draft, review, approved)
   - Search by content
   - Pagination
   - "Add Question" button

2. **Create QuestionCard component**
   - Create `/src/components/question/QuestionCard.tsx`
   - Question preview (truncated)
   - Question type badge
   - Status badge
   - Topic tag
   - Created by / approved by info
   - Edit link

3. **Create QuestionFilters component**
   - Create `/src/components/question/QuestionFilters.tsx`
   - Topic dropdown
   - Status dropdown
   - Search input

##### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId/questions/index.tsx` (create)
- `/src/components/question/QuestionCard.tsx` (create)
- `/src/components/question/QuestionFilters.tsx` (create)

##### Testing

- Unit test: QuestionCard renders correctly
- Unit test: Filters update query params
- Unit test: Pagination works
- E2E test: Filter questions by topic

---

#### Phase 2.24: Question Editor UI - Create

**Goal**: Interface for creating new questions.

##### UI Routes

| Route                                       | Purpose         |
| ------------------------------------------- | --------------- |
| `/publisher/decks/:deckId/questions/new` | Create question |

##### Tasks

1. **Create question creation page**
   - Create `/src/routes/publisher/decks/$deckId/questions/new.tsx`
   - QuestionForm component
   - Save as draft button
   - Submit for review button (if writer)
   - Save and approve button (if editor+)

2. **Create QuestionForm component**
   - Create `/src/components/question/QuestionForm.tsx`
   - Question type selector
   - Topic selector (optional)
   - Rich text editor for question content
   - Answer options section
   - Rich text editor for explanation

3. **Create AnswerOptionsEditor component**
   - Create `/src/components/question/AnswerOptionsEditor.tsx`
   - Add answer option button
   - Each option: rich text editor + correct checkbox
   - Reorder options
   - Delete option
   - Validation: at least 2 options, at least 1 correct

##### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId/questions/new.tsx` (create)
- `/src/components/question/QuestionForm.tsx` (create)
- `/src/components/question/AnswerOptionsEditor.tsx` (create)

##### Testing

- Unit test: QuestionForm validates required fields
- Unit test: AnswerOptionsEditor enforces minimums
- Unit test: Multiple select allows multiple correct
- E2E test: Create question with image and equation

---

#### Phase 2.25: Question Editor UI - Edit

**Goal**: Interface for editing existing questions.

##### UI Routes

| Route                                                   | Purpose       |
| ------------------------------------------------------- | ------------- |
| `/publisher/decks/:deckId/questions/:questionId` | Edit question |

##### Tasks

1. **Create question edit page**
   - Create `/src/routes/publisher/decks/$deckId/questions/$questionId.tsx`
   - Load existing question data
   - QuestionForm in edit mode
   - Show current status
   - Status-appropriate actions:
     - Draft: Save, Submit for Review
     - Review: Save (resets to draft), Approve, Reject (editor+)
     - Approved: Save (resets to draft)

2. **Create QuestionStatusActions component**
   - Create `/src/components/question/QuestionStatusActions.tsx`
   - Different buttons based on status and user role
   - Confirmation for status changes

##### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId/questions/$questionId.tsx` (create)
- `/src/components/question/QuestionStatusActions.tsx` (create)

##### Testing

- Unit test: Form pre-fills with question data
- Unit test: Status actions match user role
- Unit test: Edit approved question shows warning
- E2E test: Edit question and change status

---

#### Phase 2.26: Question Preview Component

**Goal**: Read-only display of questions for review and practice.

##### Tasks

1. **Create QuestionPreview component**
   - Create `/src/components/question/QuestionPreview.tsx`
   - Render TipTap content as HTML
   - Display answer options (without showing correct)
   - Display question type indicator

2. **Create QuestionWithAnswer component**
   - Create `/src/components/question/QuestionWithAnswer.tsx`
   - Extends QuestionPreview
   - Highlight correct answer(s)
   - Show explanation

3. **Add preview mode to question editor**
   - Toggle between edit and preview
   - Preview shows how learners will see it

##### Files to Create/Modify

- `/src/components/question/QuestionPreview.tsx` (create)
- `/src/components/question/QuestionWithAnswer.tsx` (create)

##### Testing

- Unit test: QuestionPreview renders content correctly
- Unit test: QuestionWithAnswer shows correct answers
- Unit test: Images and equations render in preview

---

#### Phase 2.27: Update Coverage Threshold

**Goal**: Increase coverage requirement to 70% for subsequent phases.

##### Tasks

1. **Update Vitest config**
   - Modify `vitest.config.ts`
   - Change threshold from 50 to 70

2. **Update GitHub Actions**
   - Modify `.github/workflows/ci.yml`
   - Change THRESHOLD variable from 50 to 70

3. **Verify coverage**
   - Run `pnpm test --coverage`
   - Ensure all new code is well-tested
   - Add tests if below 70%

##### Files to Create/Modify

- `vitest.config.ts` (modify)
- `.github/workflows/ci.yml` (modify)

##### Testing

- Verify CI fails if coverage drops below 70%

---

#### Phase 2 Verification Checklist

- [ ] CI/CD coverage threshold updated to 70%
- [ ] Code coverage is at least 70%
- [ ] Create deck with title and description
- [ ] Upload cover image for deck
- [ ] Add multiple topics to deck
- [ ] Reorder topics via drag and drop
- [ ] Create question with formatted text
- [ ] Create question with embedded image
- [ ] Create question with math equation
- [ ] Create question with table
- [ ] Add multiple answer options
- [ ] Mark correct answer(s)
- [ ] Add explanation to question
- [ ] Save question as draft
- [ ] Submit question for review
- [ ] Approve question (as editor)
- [ ] Reject question back to draft
- [ ] Edit approved question (resets to draft)
- [ ] Publish deck with approved questions
- [ ] Archive published deck

---

### Phase 3: Marketplace and Subscriptions

**Goal**: Enable learners to discover, preview, and subscribe to decks via Stripe.

**Coverage Target**: Maintain 70% minimum.

---

#### Phase 3.1: Stripe Environment Setup

**Goal**: Configure Stripe environment variables and install dependencies.

##### Tasks

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

##### Files to Create/Modify

- `/src/env.ts` (modify)

##### Dependencies

```bash
pnpm add stripe @stripe/stripe-js
```

##### Testing

- Unit test: Environment validation for Stripe keys

---

#### Phase 3.2: Stripe Server Client

**Goal**: Create server-side Stripe client for API calls.

##### Tasks

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

##### Files to Create/Modify

- `/src/integrations/stripe/server.ts` (create)

##### Testing

- Unit test: Client initializes correctly
- MSW: Mock Stripe API responses for each helper

---

#### Phase 3.3: Stripe Client Helpers

**Goal**: Create client-side Stripe utilities for React components.

##### Tasks

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

##### Files to Create/Modify

- `/src/integrations/stripe/client.ts` (create)
- `/src/lib/pricing.ts` (create)

##### Testing

- Unit test: Price formatting handles various currencies
- Unit test: Yearly savings calculation is accurate
- Unit test: Stripe client loads singleton correctly

---

#### Phase 3.4: Database Schema - Deck Pricing

**Goal**: Create table for storing deck subscription prices.

##### Database Schema

```typescript
export const deckPricing = pgTable("deck_pricing", {
  id: uuid().primaryKey().defaultRandom(),
  deckId: uuid("deck_id")
    .references(() => decks.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  monthlyPriceCents: integer("monthly_price_cents").notNull(),
  yearlyPriceCents: integer("yearly_price_cents").notNull(),
  stripePriceIdMonthly: text("stripe_price_id_monthly"),
  stripePriceIdYearly: text("stripe_price_id_yearly"),
  stripeProductId: text("stripe_product_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

##### Tasks

1. **Add deckPricing table to schema**
   - Define table in `/src/db/schema.ts`
   - One-to-one relationship with decks
   - Store prices in cents (avoid floating point issues)

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `DeckPricing`, `NewDeckPricing` types

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types are correct
- Unit test: Verify unique constraint on deckId

---

#### Phase 3.5: Database Schema - Subscriptions

**Goal**: Create table for tracking user subscriptions.

##### Database Schema

```typescript
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => userProfiles.id)
      .notNull(),
    deckId: uuid("deck_id")
      .references(() => decks.id)
      .notNull(),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    status: text({
      enum: ["active", "canceled", "past_due", "trialing", "incomplete"],
    }).notNull(),
    billingInterval: text("billing_interval", {
      enum: ["month", "year"],
    }).notNull(),
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueUserDeck: unique().on(table.userId, table.deckId),
  }),
);
```

##### Tasks

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

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types
- Unit test: Verify status enum values
- Unit test: Verify billing interval enum values

---

#### Phase 3.6: Database Schema - Sample Questions

**Goal**: Create table for marking questions as preview samples.

##### Database Schema

```typescript
export const sampleQuestions = pgTable("sample_questions", {
  id: uuid().primaryKey().defaultRandom(),
  deckId: uuid("deck_id")
    .references(() => decks.id, { onDelete: "cascade" })
    .notNull(),
  questionId: uuid("question_id")
    .references(() => questions.id, { onDelete: "cascade" })
    .notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
```

##### Tasks

1. **Add sampleQuestions table to schema**
   - Define table in `/src/db/schema.ts`
   - Junction table linking decks to preview questions
   - Support ordering of samples

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `SampleQuestion`, `NewSampleQuestion` types

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types
- Unit test: Verify cascade delete from deck
- Unit test: Verify cascade delete from question

---

#### Phase 3.7: Database Schema - Publisher Stripe Accounts

**Goal**: Create table for Stripe Connect account information.

##### Database Schema

```typescript
export const publisherStripeAccounts = pgTable("publisher_stripe_accounts", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull()
    .unique(),
  stripeAccountId: text("stripe_account_id").notNull().unique(),
  chargesEnabled: boolean("charges_enabled").notNull().default(false),
  payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

##### Tasks

1. **Add publisherStripeAccounts table to schema**
   - Define table in `/src/db/schema.ts`
   - One-to-one relationship with organizations
   - Track Connect account status flags

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `PublisherStripeAccount`, `NewPublisherStripeAccount` types

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types
- Unit test: Verify unique constraint on organizationId

---

#### Phase 3.8: Deck Pricing API

**Goal**: API endpoints for managing deck subscription prices.

##### API Endpoints

| Endpoint                     | Method | Purpose           |
| ---------------------------- | ------ | ----------------- |
| `/api/decks/:deckId/pricing` | GET    | Get deck pricing  |
| `/api/decks/:deckId/pricing` | PUT    | Set deck pricing  |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.decks.$deckId.pricing.ts` (create)
- `/src/lib/stripe-sync.ts` (create)
- `/src/lib/validation/pricing.ts` (create)

##### Testing

- Unit test: GET returns 403 for non-members
- Unit test: GET returns pricing or null
- Unit test: PUT returns 403 for non-admins
- Unit test: PUT validates positive prices
- Unit test: PUT creates Stripe product
- MSW: Mock Stripe product/price creation

---

#### Phase 3.9: Sample Questions API

**Goal**: API endpoints for managing deck preview samples.

##### API Endpoints

| Endpoint                     | Method | Purpose              |
| ---------------------------- | ------ | -------------------- |
| `/api/decks/:deckId/samples` | GET    | List sample questions |
| `/api/decks/:deckId/samples` | PUT    | Set sample questions  |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.decks.$deckId.samples.ts` (create)
- `/src/lib/validation/deck.ts` (modify)

##### Testing

- Unit test: GET returns samples for published deck
- Unit test: GET returns 404 for unpublished deck (non-member)
- Unit test: PUT returns 403 for writers
- Unit test: PUT validates question ownership
- Unit test: PUT enforces 5 sample limit
- Unit test: PUT replaces all samples

---

#### Phase 3.10: Marketplace List API

**Goal**: API endpoint for browsing published decks.

##### API Endpoints

| Endpoint          | Method | Purpose                   |
| ----------------- | ------ | ------------------------- |
| `/api/marketplace` | GET    | List published decks      |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.marketplace.ts` (create)
- `/src/lib/marketplace.ts` (create)

##### Testing

- Unit test: Returns only published decks
- Unit test: Returns empty for unpublished decks
- Unit test: Search filters by title/description
- Unit test: Pagination works correctly
- Unit test: Sorting works for all options
- Unit test: Includes pricing and org info

---

#### Phase 3.11: Marketplace Deck Details API

**Goal**: API endpoint for viewing a single deck's public details.

##### API Endpoints

| Endpoint                      | Method | Purpose                      |
| ----------------------------- | ------ | ---------------------------- |
| `/api/marketplace/:deckSlug` | GET    | Get deck details + samples   |

##### Tasks

1. **Create GET /api/marketplace/:deckSlug endpoint**
   - Create `/src/routes/api.marketplace.$deckSlug.ts`
   - Public endpoint
   - Return 404 if deck not published
   - Include deck details, pricing, org info
   - Include sample questions with full content
   - Include topic list (names only)
   - Include total question count
   - If authenticated, include user's subscription status

##### Files to Create/Modify

- `/src/routes/api.marketplace.$deckSlug.ts` (create)

##### Testing

- Unit test: Returns 404 for unpublished deck
- Unit test: Returns 404 for non-existent slug
- Unit test: Returns deck with samples
- Unit test: Includes subscription status when authenticated
- Unit test: Excludes subscription status when unauthenticated

---

#### Phase 3.12: User Subscriptions List API

**Goal**: API endpoint for listing user's active subscriptions.

##### API Endpoints

| Endpoint            | Method | Purpose                  |
| ------------------- | ------ | ------------------------ |
| `/api/subscriptions` | GET    | List user's subscriptions |

##### Tasks

1. **Create GET /api/subscriptions endpoint**
   - Create `/src/routes/api.subscriptions.ts`
   - Require authentication
   - Return all subscriptions for current user
   - Include deck info (title, slug, cover image)
   - Include subscription status and billing info
   - Include next billing date
   - Order by status (active first), then by name

##### Files to Create/Modify

- `/src/routes/api.subscriptions.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns empty array for user with no subscriptions
- Unit test: Returns subscriptions with deck info
- Unit test: Orders active subscriptions first

---

#### Phase 3.13: Stripe Checkout Session API

**Goal**: API endpoint for creating Stripe Checkout sessions.

##### API Endpoints

| Endpoint                      | Method | Purpose                       |
| ----------------------------- | ------ | ----------------------------- |
| `/api/subscriptions/checkout` | POST   | Create Stripe Checkout session |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.subscriptions.checkout.ts` (create)
- `/src/integrations/stripe/server.ts` (modify)
- `/src/lib/validation/checkout.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 400 for invalid deckId
- Unit test: Returns 409 if already subscribed
- Unit test: Creates checkout session successfully
- Unit test: Returns session ID and URL
- MSW: Mock Stripe checkout session creation

---

#### Phase 3.14: Stripe Customer Portal API

**Goal**: API endpoint for accessing Stripe billing portal.

##### API Endpoints

| Endpoint                    | Method | Purpose                      |
| --------------------------- | ------ | ---------------------------- |
| `/api/subscriptions/portal` | POST   | Create Customer Portal session |

##### Tasks

1. **Create POST /api/subscriptions/portal endpoint**
   - Create `/src/routes/api.subscriptions.portal.ts`
   - Require authentication
   - Get user's Stripe customer ID
   - Return 404 if user has no customer record
   - Create billing portal session
   - Configure return URL
   - Return portal URL

##### Files to Create/Modify

- `/src/routes/api.subscriptions.portal.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 404 if no customer record
- Unit test: Returns portal URL
- MSW: Mock Stripe portal session creation

---

#### Phase 3.15: Subscription Cancel API

**Goal**: API endpoint for canceling subscriptions.

##### API Endpoints

| Endpoint                                   | Method | Purpose             |
| ------------------------------------------ | ------ | ------------------- |
| `/api/subscriptions/:subscriptionId/cancel` | POST   | Cancel subscription |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.subscriptions.$subscriptionId.cancel.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for other user's subscription
- Unit test: Returns 404 for non-existent subscription
- Unit test: Cancels subscription at period end
- Unit test: Reactivates canceled subscription
- MSW: Mock Stripe subscription update

---

#### Phase 3.16: Stripe Webhook Handler - Setup

**Goal**: Create webhook endpoint and verification infrastructure.

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.webhooks.stripe.ts` (create)
- `/src/integrations/stripe/webhooks.ts` (create)

##### Testing

- Unit test: Rejects invalid signature
- Unit test: Accepts valid signature
- Unit test: Routes events to correct handlers
- Unit test: Returns 200 for unhandled events

---

#### Phase 3.17: Stripe Webhook - Checkout Completed

**Goal**: Handle checkout.session.completed event to create subscriptions.

##### Tasks

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

##### Files to Create/Modify

- `/src/integrations/stripe/webhooks.ts` (modify)
- `/src/routes/api.subscriptions.checkout.ts` (modify - add metadata)

##### Testing

- Unit test: Creates subscription record
- Unit test: Sets correct status and dates
- Unit test: Links to correct user and deck
- Unit test: Handles missing metadata gracefully

---

#### Phase 3.18: Stripe Webhook - Subscription Updated

**Goal**: Handle subscription update events for status changes.

##### Tasks

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

##### Files to Create/Modify

- `/src/integrations/stripe/webhooks.ts` (modify)

##### Testing

- Unit test: Updates status correctly
- Unit test: Updates period dates
- Unit test: Handles cancel_at_period_end flag
- Unit test: Marks deleted subscription as canceled
- Unit test: Ignores unknown subscription IDs

---

#### Phase 3.19: Stripe Webhook - Invoice Events

**Goal**: Handle invoice events for payment tracking.

##### Tasks

1. **Create invoice payment succeeded handler**
   - Add to `/src/integrations/stripe/webhooks.ts`
   - `handleInvoicePaymentSucceeded(invoice)` function
   - Update subscription status if was past_due
   - Record payment for revenue tracking (Phase 5)

2. **Create invoice payment failed handler**
   - `handleInvoicePaymentFailed(invoice)` function
   - Update subscription status to past_due
   - Could trigger email notification (future)

##### Files to Create/Modify

- `/src/integrations/stripe/webhooks.ts` (modify)

##### Testing

- Unit test: Payment succeeded updates past_due to active
- Unit test: Payment failed updates to past_due
- Unit test: Handles missing subscription gracefully

---

#### Phase 3.20: Stripe Connect - Onboarding API

**Goal**: API endpoint for publishers to start Stripe Connect onboarding.

##### API Endpoints

| Endpoint                          | Method | Purpose                     |
| --------------------------------- | ------ | --------------------------- |
| `/api/publisher/stripe/onboard` | POST   | Create Connect onboarding link |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.publisher.stripe.onboard.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for non-publishers
- Unit test: Returns 403 for non-admins
- Unit test: Creates Connect account
- Unit test: Returns onboarding URL
- MSW: Mock Stripe Connect account creation

---

#### Phase 3.21: Stripe Connect - Dashboard API

**Goal**: API endpoint for publishers to access Stripe Express Dashboard.

##### API Endpoints

| Endpoint                           | Method | Purpose                    |
| ---------------------------------- | ------ | -------------------------- |
| `/api/publisher/stripe/dashboard` | GET    | Get Express Dashboard link |

##### Tasks

1. **Create GET /api/publisher/stripe/dashboard endpoint**
   - Create `/src/routes/api.publisher.stripe.dashboard.ts`
   - Require authentication
   - Verify user is owner/admin of organization
   - Get organization's Connect account
   - Return 404 if no Connect account
   - Create login link to Express Dashboard
   - Return dashboard URL

##### Files to Create/Modify

- `/src/routes/api.publisher.stripe.dashboard.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for non-admins
- Unit test: Returns 404 if no Connect account
- Unit test: Returns dashboard URL
- MSW: Mock Stripe login link creation

---

#### Phase 3.22: Stripe Webhook - Connect Account Updated

**Goal**: Handle Connect account updates for onboarding status.

##### Tasks

1. **Create account updated handler**
   - Add to `/src/integrations/stripe/webhooks.ts`
   - `handleAccountUpdated(account)` function
   - Find publisher account by Stripe account ID
   - Update charges_enabled, payouts_enabled flags
   - Determine if onboarding is complete
   - Update database record

##### Files to Create/Modify

- `/src/integrations/stripe/webhooks.ts` (modify)

##### Testing

- Unit test: Updates charges_enabled flag
- Unit test: Updates payouts_enabled flag
- Unit test: Sets onboardingComplete when both enabled
- Unit test: Ignores unknown account IDs

---

#### Phase 3.23: Marketplace UI - Browse Page

**Goal**: Page for learners to browse published decks.

##### UI Routes

| Route                   | Purpose        |
| ----------------------- | -------------- |
| `/marketplace` | Browse all decks |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/marketplace/index.tsx` (create)
- `/src/components/marketplace/SearchBar.tsx` (create)
- `/src/components/marketplace/DeckFilters.tsx` (create)

##### Testing

- Unit test: SearchBar debounces input
- Unit test: DeckFilters updates query params
- E2E test: Search for deck by name
- E2E test: Sort decks by price

---

#### Phase 3.24: Marketplace UI - Deck Preview Card

**Goal**: Card component for displaying deck in marketplace.

##### Tasks

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

##### Files to Create/Modify

- `/src/components/marketplace/DeckPreviewCard.tsx` (create)
- `/src/components/marketplace/PricingBadge.tsx` (create)

##### Testing

- Unit test: Card renders all deck info
- Unit test: Card shows placeholder for missing image
- Unit test: PricingBadge shows correct format
- Unit test: Card links to correct detail page

---

#### Phase 3.25: Marketplace UI - Deck Detail Page

**Goal**: Page showing full deck details with sample questions.

##### UI Routes

| Route                       | Purpose          |
| --------------------------- | ---------------- |
| `/marketplace/:deckSlug` | Deck preview page |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/marketplace/$deckSlug.tsx` (create)
- `/src/components/marketplace/PricingCard.tsx` (create)
- `/src/components/marketplace/SampleQuestionViewer.tsx` (create)

##### Testing

- Unit test: Page shows deck info
- Unit test: PricingCard toggles between intervals
- Unit test: SampleQuestionViewer navigates samples
- Unit test: Subscribe button disabled when subscribed
- E2E test: View deck and try sample question

---

#### Phase 3.26: Subscription UI - Pricing Toggle

**Goal**: Component for switching between monthly/yearly pricing.

##### Tasks

1. **Create PricingToggle component**
   - Create `/src/components/subscription/PricingToggle.tsx`
   - Two options: Monthly / Yearly
   - Highlight active option
   - Show savings percentage on yearly
   - Emit onChange with selected interval

##### Files to Create/Modify

- `/src/components/subscription/PricingToggle.tsx` (create)

##### Testing

- Unit test: Shows both options
- Unit test: Highlights active option
- Unit test: Shows savings percentage
- Unit test: Emits correct value on change

---

#### Phase 3.27: Subscription UI - Checkout Button

**Goal**: Button component that initiates Stripe Checkout.

##### Tasks

1. **Create CheckoutButton component**
   - Create `/src/components/subscription/CheckoutButton.tsx`
   - Accept deckId and billingInterval props
   - Loading state during API call
   - Call checkout API to get session
   - Redirect to Stripe Checkout
   - Handle errors (show toast)

##### Files to Create/Modify

- `/src/components/subscription/CheckoutButton.tsx` (create)

##### Testing

- Unit test: Shows loading state
- Unit test: Calls checkout API with correct params
- Unit test: Handles API errors gracefully
- MSW: Mock checkout session response

---

#### Phase 3.28: Checkout UI - Success/Cancel Pages

**Goal**: Pages shown after Stripe Checkout completes or is canceled.

##### UI Routes

| Route                | Purpose             |
| -------------------- | ------------------- |
| `/checkout/success` | Post-checkout success |
| `/checkout/canceled` | Checkout canceled     |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/checkout/success.tsx` (create)
- `/src/routes/checkout/canceled.tsx` (create)

##### Testing

- Unit test: Success page shows correct message
- Unit test: Success page links to practice
- Unit test: Canceled page shows correct message
- Unit test: Canceled page links to marketplace

---

#### Phase 3.29: Learner UI - Library Page

**Goal**: Page showing learner's subscribed decks.

##### UI Routes

| Route              | Purpose             |
| ------------------ | ------------------- |
| `/learner/library` | My subscribed decks |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/learner.tsx` (create)
- `/src/routes/learner/library.tsx` (create)
- `/src/components/subscription/SubscriptionCard.tsx` (create)

##### Testing

- Unit test: Layout redirects unauthenticated users
- Unit test: Library shows all subscriptions
- Unit test: SubscriptionCard shows correct status
- E2E test: View library and click practice

---

#### Phase 3.30: Learner UI - Subscription Management

**Goal**: Page for managing subscriptions (cancel, reactivate).

##### UI Routes

| Route                     | Purpose               |
| ------------------------- | --------------------- |
| `/learner/subscriptions` | Subscription management |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/learner/subscriptions.tsx` (create)
- `/src/components/subscription/SubscriptionStatusBadge.tsx` (create)

##### Testing

- Unit test: Page shows all subscriptions
- Unit test: StatusBadge shows correct color
- Unit test: Cancel button shows confirmation
- Unit test: Reactivate works for pending cancellation
- E2E test: Cancel and reactivate subscription

---

#### Phase 3.31: Publisher UI - Deck Pricing Page

**Goal**: Page for publishers to set deck subscription prices.

##### UI Routes

| Route                               | Purpose        |
| ----------------------------------- | -------------- |
| `/publisher/decks/:deckId/pricing` | Set deck pricing |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId/pricing.tsx` (create)
- `/src/components/deck/PricingForm.tsx` (create)

##### Testing

- Unit test: Form validates positive prices
- Unit test: Form converts dollars to cents
- Unit test: Form shows savings calculation
- Unit test: Submit syncs to Stripe
- E2E test: Set deck pricing

---

#### Phase 3.32: Publisher UI - Sample Questions Selection

**Goal**: Interface for selecting sample questions to show in marketplace.

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId.tsx` (modify - add tab)
- `/src/routes/publisher/decks/$deckId/samples.tsx` (create)
- `/src/components/deck/SampleQuestionSelector.tsx` (create)

##### Testing

- Unit test: Selector shows only approved questions
- Unit test: Selector enforces 5 max limit
- Unit test: Drag and drop reorders samples
- E2E test: Select and save sample questions

---

#### Phase 3.33: Publisher UI - Stripe Onboarding Page

**Goal**: Page guiding publishers through Stripe Connect setup.

##### UI Routes

| Route                        | Purpose            |
| ---------------------------- | ------------------ |
| `/publisher/stripe-onboard` | Stripe Connect flow |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/publisher/stripe-onboard.tsx` (create)
- `/src/components/publisher/OnboardingStatus.tsx` (create)

##### Testing

- Unit test: Page shows correct state
- Unit test: Start button calls onboard API
- Unit test: Continue button available when in progress
- Unit test: Dashboard link shown when complete
- E2E test: Start onboarding flow

---

#### Phase 3.34: Publisher UI - Payouts Dashboard

**Goal**: Page showing publisher payout status and history.

##### UI Routes

| Route                 | Purpose          |
| --------------------- | ---------------- |
| `/publisher/payouts` | Payout dashboard |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/publisher/payouts.tsx` (create)
- `/src/components/publisher/PayoutSummary.tsx` (create)

##### Testing

- Unit test: Redirects if onboarding incomplete
- Unit test: Shows payout info
- Unit test: Dashboard link works
- MSW: Mock Stripe balance/payout APIs

---

#### Phase 3.35: Access Control for Subscribed Content

**Goal**: Implement content access checks based on subscription status.

##### Tasks

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

##### Files to Create/Modify

- `/src/lib/permissions.ts` (modify)
- `/src/routes/api.decks.$deckId.questions.ts` (modify)
- `/src/lib/middleware/subscription.ts` (create)

##### Testing

- Unit test: hasActiveSubscription returns true for active
- Unit test: hasActiveSubscription returns false for canceled
- Unit test: hasActiveSubscription returns false for past_due after grace
- Unit test: Questions API returns 403 without subscription
- Unit test: Questions API returns questions with subscription

---

#### Phase 3 Verification Checklist

- [ ] Code coverage maintained at 70%+
- [ ] Stripe environment variables configured
- [ ] Stripe packages installed and client working
- [ ] All database tables created and migrated
- [ ] Deck pricing can be set and syncs to Stripe
- [ ] Sample questions can be selected (max 5)
- [ ] Marketplace shows only published decks with pricing
- [ ] Deck detail page shows samples and pricing
- [ ] Complete Stripe Connect onboarding as publisher
- [ ] Set deck pricing as publisher
- [ ] Browse marketplace as learner
- [ ] View deck details and sample questions
- [ ] Subscribe to deck via Stripe Checkout
- [ ] Verify subscription created in database
- [ ] Access subscribed deck content
- [ ] View subscriptions in learner dashboard
- [ ] Cancel subscription (cancels at period end)
- [ ] Reactivate canceled subscription
- [ ] Access Stripe billing portal
- [ ] Stripe webhooks process correctly
- [ ] Access control prevents unauthorized question access

---

### Phase 4: Practice Sessions and Performance Tracking

**Goal**: Enable learners to practice with subscribed decks and track performance.

**Coverage Target**: Maintain 70% minimum.

---

#### Phase 4.1: Recharts Installation

**Goal**: Install charting library for analytics visualizations.

##### Tasks

1. **Install Recharts package**
   - Run `pnpm add recharts`
   - Verify installation in package.json

2. **Create chart theme configuration**
   - Create `/src/lib/chart-theme.ts`
   - Define consistent colors for charts
   - Define responsive breakpoints for chart sizing

##### Files to Create/Modify

- `/src/lib/chart-theme.ts` (create)

##### Dependencies

```bash
pnpm add recharts
```

##### Testing

- Unit test: Chart theme exports correct colors

---

#### Phase 4.2: Database Schema - Practice Sessions

**Goal**: Create table for tracking practice session configurations.

##### Database Schema

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

##### Tasks

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

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types are correct
- Unit test: Verify mode enum values
- Unit test: Verify status enum values

---

#### Phase 4.3: Database Schema - Session Topics

**Goal**: Create junction table for tracking which topics are included in a session.

##### Database Schema

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

##### Tasks

1. **Add sessionTopics table to schema**
   - Define table in `/src/db/schema.ts`
   - Cascade delete when session is deleted

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `SessionTopic`, `NewSessionTopic` types

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types
- Unit test: Verify cascade delete behavior

---

#### Phase 4.4: Database Schema - Session Questions

**Goal**: Create table for storing the ordered list of questions in a session.

##### Database Schema

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

##### Tasks

1. **Add sessionQuestions table to schema**
   - Define table in `/src/db/schema.ts`
   - Track question order within session

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `SessionQuestion`, `NewSessionQuestion` types

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types
- Unit test: Verify cascade delete from session

---

#### Phase 4.5: Database Schema - Question Attempts

**Goal**: Create table for recording individual question answers.

##### Database Schema

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
  timeSpentSeconds: integer("time_spent_seconds"),
  attemptedAt: timestamp("attempted_at").defaultNow(),
});
```

##### Tasks

1. **Add questionAttempts table to schema**
   - Define table in `/src/db/schema.ts`
   - Store selected answers as JSONB array
   - Track correctness and time spent

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `QuestionAttempt`, `NewQuestionAttempt` types

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types
- Unit test: Verify JSONB stores array of UUIDs

---

#### Phase 4.6: Database Schema - Topic Performance

**Goal**: Create table for aggregated performance statistics by topic.

##### Database Schema

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

##### Tasks

1. **Add topicPerformance table to schema**
   - Define table in `/src/db/schema.ts`
   - Unique constraint on user + topic
   - Track cumulative statistics

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `TopicPerformance`, `NewTopicPerformance` types

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types
- Unit test: Verify unique constraint on userId + topicId

---

#### Phase 4.7: Database Schema - Daily Performance

**Goal**: Create table for daily performance summaries.

##### Database Schema

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

##### Tasks

1. **Add dailyPerformance table to schema**
   - Define table in `/src/db/schema.ts`
   - Unique constraint on user + deck + date
   - Enable time-series performance tracking

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `DailyPerformance`, `NewDailyPerformance` types

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types
- Unit test: Verify unique constraint on userId + deckId + date

---

#### Phase 4.8: Answer Correctness Logic

**Goal**: Create utility functions for evaluating answer correctness.

##### Tasks

1. **Create answer evaluation module**
   - Create `/src/lib/practice/answer-check.ts`
   - `checkMultipleChoice(selectedId, correctId)` - Single correct answer
   - `checkMultipleSelect(selectedIds, correctIds)` - Multiple correct answers
   - `checkTrueFalse(selected, correct)` - True/false questions

2. **Create scoring utilities**
   - Create `/src/lib/practice/scoring.ts`
   - `calculateSessionScore(attempts)` - Calculate percentage
   - `calculateTopicScores(attempts)` - Breakdown by topic

##### Files to Create/Modify

- `/src/lib/practice/answer-check.ts` (create)
- `/src/lib/practice/scoring.ts` (create)

##### Testing

- Unit test: Multiple choice returns true for correct answer
- Unit test: Multiple choice returns false for incorrect answer
- Unit test: Multiple select requires all correct options
- Unit test: Multiple select fails if extra option selected
- Unit test: Session score calculation is accurate
- Unit test: Topic scores group correctly

---

#### Phase 4.9: Question Selection Algorithm

**Goal**: Create logic for selecting and randomizing session questions.

##### Tasks

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

##### Files to Create/Modify

- `/src/lib/practice/question-selection.ts` (create)

##### Testing

- Unit test: Returns requested number of questions
- Unit test: Only returns approved questions
- Unit test: Filters by selected topics
- Unit test: Randomizes order
- Unit test: Handles fewer questions than requested

---

#### Phase 4.10: Start Practice Session API

**Goal**: API endpoint to create a new practice session.

##### API Endpoints

| Endpoint              | Method | Purpose                     |
| --------------------- | ------ | --------------------------- |
| `/api/practice/start` | POST   | Create new practice session |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.practice.start.ts` (create)
- `/src/lib/validation/practice.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 without subscription
- Unit test: Validates configuration
- Unit test: Creates session with correct config
- Unit test: Selects correct number of questions
- Unit test: Returns session ID

---

#### Phase 4.11: Get Session Details API

**Goal**: API endpoint to retrieve session information.

##### API Endpoints

| Endpoint                     | Method | Purpose             |
| ---------------------------- | ------ | ------------------- |
| `/api/practice/:sessionId` | GET    | Get session details |

##### Tasks

1. **Create GET /api/practice/:sessionId endpoint**
   - Create `/src/routes/api.practice.$sessionId.ts`
   - Require authentication
   - Verify session belongs to current user
   - Return session configuration
   - Return progress (questions answered / total)
   - Return time elapsed (if timed)
   - Return current status

##### Files to Create/Modify

- `/src/routes/api.practice.$sessionId.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for other user's session
- Unit test: Returns 404 for non-existent session
- Unit test: Returns session details
- Unit test: Calculates progress correctly

---

#### Phase 4.12: Get Session Questions API

**Goal**: API endpoint to retrieve questions for a session.

##### API Endpoints

| Endpoint                               | Method | Purpose               |
| -------------------------------------- | ------ | --------------------- |
| `/api/practice/:sessionId/questions` | GET    | Get session questions |

##### Tasks

1. **Create GET /api/practice/:sessionId/questions endpoint**
   - Create `/src/routes/api.practice.$sessionId.questions.ts`
   - Require authentication
   - Verify session belongs to current user
   - Return questions in order
   - Include question content and answer options
   - Do NOT include correct answers (client determines)
   - Support pagination for large sessions
   - Indicate which questions are already answered

##### Files to Create/Modify

- `/src/routes/api.practice.$sessionId.questions.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for other user's session
- Unit test: Returns questions in order
- Unit test: Does not expose correct answers
- Unit test: Indicates answered questions

---

#### Phase 4.13: Submit Answer API

**Goal**: API endpoint to submit an answer for a question.

##### API Endpoints

| Endpoint                            | Method | Purpose         |
| ----------------------------------- | ------ | --------------- |
| `/api/practice/:sessionId/submit` | POST   | Submit answer   |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.practice.$sessionId.submit.ts` (create)
- `/src/lib/practice/performance-update.ts` (create)

##### Testing

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

#### Phase 4.14: Complete Session API

**Goal**: API endpoint to mark a session as completed.

##### API Endpoints

| Endpoint                              | Method | Purpose          |
| ------------------------------------- | ------ | ---------------- |
| `/api/practice/:sessionId/complete` | POST   | Complete session |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.practice.$sessionId.complete.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for other user's session
- Unit test: Returns 400 if already completed
- Unit test: Sets status to completed
- Unit test: Sets completedAt timestamp
- Unit test: Abandon sets status to abandoned

---

#### Phase 4.15: Session Results API

**Goal**: API endpoint to retrieve detailed session results.

##### API Endpoints

| Endpoint                             | Method | Purpose             |
| ------------------------------------ | ------ | ------------------- |
| `/api/practice/:sessionId/results` | GET    | Get session results |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.practice.$sessionId.results.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for other user's session
- Unit test: Returns 400 if session in_progress
- Unit test: Returns overall score
- Unit test: Returns topic breakdown
- Unit test: Returns question details with answers

---

#### Phase 4.16: Analytics Overview API

**Goal**: API endpoint for user's overall performance summary.

##### API Endpoints

| Endpoint                 | Method | Purpose                   |
| ------------------------ | ------ | ------------------------- |
| `/api/analytics/overview` | GET    | User performance overview |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.analytics.overview.ts` (create)
- `/src/lib/analytics/streaks.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns totals correctly
- Unit test: Calculates accuracy correctly
- Unit test: Current streak counts consecutive days
- Unit test: Streak resets after missed day

---

#### Phase 4.17: Deck Analytics API

**Goal**: API endpoint for deck-specific performance analytics.

##### API Endpoints

| Endpoint                        | Method | Purpose               |
| ------------------------------- | ------ | --------------------- |
| `/api/analytics/deck/:deckId` | GET    | Deck-specific analytics |

##### Tasks

1. **Create GET /api/analytics/deck/:deckId endpoint**
   - Create `/src/routes/api.analytics.deck.$deckId.ts`
   - Require authentication
   - Verify user has subscription to deck
   - Return sessions completed for this deck
   - Return questions answered for this deck
   - Return accuracy for this deck
   - Return recent session history
   - Return improvement trend (last 7 days vs previous 7)

##### Files to Create/Modify

- `/src/routes/api.analytics.deck.$deckId.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 without subscription
- Unit test: Returns deck-specific statistics
- Unit test: Calculates improvement trend

---

#### Phase 4.18: Topic Analytics API

**Goal**: API endpoint for topic-level performance breakdown.

##### API Endpoints

| Endpoint              | Method | Purpose         |
| --------------------- | ------ | --------------- |
| `/api/analytics/topics` | GET    | Topic breakdown |

##### Tasks

1. **Create GET /api/analytics/topics endpoint**
   - Create `/src/routes/api.analytics.topics.ts`
   - Require authentication
   - Accept optional deckId filter
   - Return performance by topic
   - Include topic name, total attempts, accuracy
   - Sort by accuracy (weakest topics first)
   - Identify topics needing improvement

##### Files to Create/Modify

- `/src/routes/api.analytics.topics.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns all topics when no deckId
- Unit test: Filters by deckId when provided
- Unit test: Sorts by accuracy ascending
- Unit test: Calculates accuracy per topic

---

#### Phase 4.19: Performance Trends API

**Goal**: API endpoint for performance over time.

##### API Endpoints

| Endpoint              | Method | Purpose              |
| --------------------- | ------ | -------------------- |
| `/api/analytics/trends` | GET    | Performance over time |

##### Tasks

1. **Create GET /api/analytics/trends endpoint**
   - Create `/src/routes/api.analytics.trends.ts`
   - Require authentication
   - Accept date range (default: last 30 days)
   - Accept optional deckId filter
   - Return daily performance data
   - Include date, attempts, correct, accuracy
   - Fill in zero values for days without practice

##### Files to Create/Modify

- `/src/routes/api.analytics.trends.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns data for date range
- Unit test: Fills zeros for missing days
- Unit test: Filters by deckId when provided
- Unit test: Respects date range parameters

---

#### Phase 4.20: Anonymous Comparison API

**Goal**: API endpoint for comparing performance to other learners.

##### API Endpoints

| Endpoint               | Method | Purpose                 |
| ---------------------- | ------ | ----------------------- |
| `/api/analytics/compare` | GET    | Anonymous comparison data |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.analytics.compare.ts` (create)
- `/src/lib/analytics/comparison.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 without subscription
- Unit test: Returns percentile ranking
- Unit test: Returns distribution without user identification
- Unit test: Handles decks with few learners gracefully

---

#### Phase 4.21: Practice UI - Deck Selection Page

**Goal**: Page for selecting which deck to practice.

##### UI Routes

| Route               | Purpose               |
| ------------------- | --------------------- |
| `/learner/practice` | Select deck to practice |

##### Tasks

1. **Create practice index page**
   - Create `/src/routes/learner/practice/index.tsx`
   - List all subscribed decks
   - Show deck card with practice button
   - Show recent session info per deck
   - Show accuracy badge per deck
   - Empty state if no subscriptions

##### Files to Create/Modify

- `/src/routes/learner/practice/index.tsx` (create)

##### Testing

- Unit test: Shows all subscribed decks
- Unit test: Shows accuracy for each deck
- Unit test: Empty state when no subscriptions
- E2E test: Navigate to deck practice

---

#### Phase 4.22: Practice UI - Deck Practice Home

**Goal**: Landing page for practicing a specific deck.

##### UI Routes

| Route                            | Purpose           |
| -------------------------------- | ----------------- |
| `/learner/practice/:deckId` | Deck practice home |

##### Tasks

1. **Create deck practice home page**
   - Create `/src/routes/learner/practice/$deckId/index.tsx`
   - Verify subscription
   - Show deck title and stats
   - Quick start button (default config)
   - Custom session button (to config page)
   - Recent sessions list
   - Topic performance overview

##### Files to Create/Modify

- `/src/routes/learner/practice/$deckId/index.tsx` (create)

##### Testing

- Unit test: Shows deck info
- Unit test: Shows recent sessions
- Unit test: Quick start creates session
- E2E test: Start quick practice session

---

#### Phase 4.23: Practice UI - Session Configuration

**Goal**: Page for configuring a custom practice session.

##### UI Routes

| Route                                  | Purpose               |
| -------------------------------------- | --------------------- |
| `/learner/practice/:deckId/config` | Session configuration |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/learner/practice/$deckId/config.tsx` (create)
- `/src/components/practice/SessionConfigForm.tsx` (create)
- `/src/components/practice/TopicSelector.tsx` (create)

##### Testing

- Unit test: Form validates configuration
- Unit test: Topic selector handles selection
- Unit test: Start button creates session
- E2E test: Configure and start custom session

---

#### Phase 4.24: Practice UI - Timer Component

**Goal**: Countdown timer for timed practice sessions.

##### Tasks

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

##### Files to Create/Modify

- `/src/components/practice/Timer.tsx` (create)
- `/src/hooks/useTimer.ts` (create)

##### Testing

- Unit test: Timer counts down correctly
- Unit test: Timer pauses and resumes
- Unit test: Timer calls onExpire when done
- Unit test: Timer shows warning states

---

#### Phase 4.25: Practice UI - Progress Bar Component

**Goal**: Visual progress indicator for practice sessions.

##### Tasks

1. **Create ProgressBar component**
   - Create `/src/components/practice/ProgressBar.tsx`
   - Show current question number / total
   - Visual bar indicating progress
   - Optional: show answered vs remaining
   - Animate on progress change

##### Files to Create/Modify

- `/src/components/practice/ProgressBar.tsx` (create)

##### Testing

- Unit test: Shows correct progress
- Unit test: Updates on question change
- Unit test: Shows 100% when complete

---

#### Phase 4.26: Practice UI - Question Display Component

**Goal**: Component for rendering question content.

##### Tasks

1. **Create QuestionDisplay component**
   - Create `/src/components/practice/QuestionDisplay.tsx`
   - Render TipTap JSON content
   - Display question type indicator
   - Display topic tag
   - Handle images and equations
   - Responsive layout

##### Files to Create/Modify

- `/src/components/practice/QuestionDisplay.tsx` (create)

##### Testing

- Unit test: Renders question content
- Unit test: Shows question type badge
- Unit test: Renders images correctly
- Unit test: Renders equations correctly

---

#### Phase 4.27: Practice UI - Answer Selector Component

**Goal**: Component for selecting answer options.

##### Tasks

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

##### Files to Create/Modify

- `/src/components/practice/AnswerSelector.tsx` (create)

##### Testing

- Unit test: Renders all options
- Unit test: Single select allows one selection
- Unit test: Multi-select allows multiple selections
- Unit test: Disabled state prevents selection

---

#### Phase 4.28: Practice UI - Immediate Feedback Component

**Goal**: Component showing feedback after answering in immediate mode.

##### Tasks

1. **Create ImmediateFeedback component**
   - Create `/src/components/practice/ImmediateFeedback.tsx`
   - Show correct/incorrect indicator
   - Highlight correct answer(s)
   - Show user's selected answer(s)
   - Display explanation
   - "Next Question" button

##### Files to Create/Modify

- `/src/components/practice/ImmediateFeedback.tsx` (create)

##### Testing

- Unit test: Shows correct indicator when correct
- Unit test: Shows incorrect indicator when wrong
- Unit test: Highlights correct answers
- Unit test: Displays explanation

---

#### Phase 4.29: Practice UI - Active Session Page

**Goal**: Main page for taking a practice session.

##### UI Routes

| Route                                                     | Purpose        |
| --------------------------------------------------------- | -------------- |
| `/learner/practice/:deckId/session/:sessionId` | Active session |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/learner/practice/$deckId/session/$sessionId.tsx` (create)

##### Testing

- Unit test: Loads session correctly
- Unit test: Displays current question
- Unit test: Submits answer correctly
- Unit test: Shows feedback in immediate mode
- Unit test: Navigates in exam mode
- E2E test: Complete practice session

---

#### Phase 4.30: Practice UI - Session Results Page

**Goal**: Page showing detailed results after completing a session.

##### UI Routes

| Route                                                              | Purpose |
| ------------------------------------------------------------------ | ------- |
| `/learner/practice/:deckId/session/:sessionId/results` | Results |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/learner/practice/$deckId/session/$sessionId/results.tsx` (create)
- `/src/components/practice/SessionResults.tsx` (create)
- `/src/components/practice/QuestionReview.tsx` (create)

##### Testing

- Unit test: Shows overall score
- Unit test: Shows topic breakdown
- Unit test: Question review shows details
- Unit test: Filter incorrect works
- E2E test: View session results

---

#### Phase 4.31: Analytics UI - Performance Dashboard

**Goal**: Main analytics dashboard for learners.

##### UI Routes

| Route                | Purpose             |
| -------------------- | ------------------- |
| `/learner/analytics` | Performance dashboard |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/learner/analytics/index.tsx` (create)
- `/src/components/analytics/PerformanceOverview.tsx` (create)
- `/src/components/analytics/StreakCounter.tsx` (create)

##### Testing

- Unit test: Shows overall statistics
- Unit test: Shows current streak
- Unit test: Shows deck breakdown
- E2E test: View analytics dashboard

---

#### Phase 4.32: Analytics UI - Trend Chart Component

**Goal**: Chart component showing performance over time.

##### Tasks

1. **Create TrendChart component**
   - Create `/src/components/analytics/TrendChart.tsx`
   - Line chart using Recharts
   - Show accuracy over time
   - Show attempts over time
   - Date range selector
   - Responsive sizing
   - Tooltip with details

##### Files to Create/Modify

- `/src/components/analytics/TrendChart.tsx` (create)

##### Testing

- Unit test: Renders chart with data
- Unit test: Shows tooltip on hover
- Unit test: Handles empty data gracefully
- Unit test: Updates on date range change

---

#### Phase 4.33: Analytics UI - Topic Breakdown Component

**Goal**: Component showing performance by topic.

##### Tasks

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

##### Files to Create/Modify

- `/src/components/analytics/TopicBreakdown.tsx` (create)
- `/src/components/analytics/AccuracyBadge.tsx` (create)

##### Testing

- Unit test: Shows all topics
- Unit test: Sorts by accuracy
- Unit test: AccuracyBadge shows correct color
- Unit test: Highlights weak topics

---

#### Phase 4.34: Analytics UI - Deck Analytics Page

**Goal**: Detailed analytics page for a specific deck.

##### UI Routes

| Route                          | Purpose        |
| ------------------------------ | -------------- |
| `/learner/analytics/:deckId` | Deck analytics |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/learner/analytics/$deckId.tsx` (create)
- `/src/components/analytics/ComparisonChart.tsx` (create)

##### Testing

- Unit test: Shows deck-specific stats
- Unit test: Shows comparison percentile
- Unit test: Shows session history
- E2E test: View deck analytics

---

#### Phase 4.35: Session Recovery

**Goal**: Handle interrupted sessions and browser refresh.

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/learner/practice/$deckId/index.tsx` (modify)
- `/src/lib/practice/session-recovery.ts` (create)

##### Testing

- Unit test: Detects in_progress sessions
- Unit test: Restores from localStorage
- Unit test: Auto-abandons old sessions
- E2E test: Refresh during session and resume

---

#### Phase 4 Verification Checklist

- [ ] Code coverage maintained at 70%+
- [ ] Recharts installed and working
- [ ] All database tables created and migrated
- [ ] Practice session can be configured (mode, topics, count, timing)
- [ ] Questions are randomly selected based on configuration
- [ ] Immediate feedback mode shows answer after each question
- [ ] Exam simulation mode hides answers until end
- [ ] Timer works for timed sessions
- [ ] Progress bar updates correctly
- [ ] Answers are checked for correctness
- [ ] Topic performance is updated after each answer
- [ ] Daily performance is updated after each answer
- [ ] Session can be completed
- [ ] Session results show overall score
- [ ] Session results show topic breakdown
- [ ] Session results show question review
- [ ] Analytics dashboard shows overview statistics
- [ ] Streak counter works correctly
- [ ] Trend chart shows performance over time
- [ ] Topic breakdown highlights weak areas
- [ ] Deck analytics shows comparison to others
- [ ] In-progress sessions can be resumed
- [ ] Session state persists through refresh

---

### Phase 5: Publisher Analytics and Question Reporting

**Goal**: Give publishers insights and handle learner feedback.

**Coverage Target**: Maintain 70% minimum.

---

#### Phase 5.1: Database Schema - Question Reports

**Goal**: Create table for learner-submitted question reports.

##### Database Schema

```typescript
export const questionReports = pgTable("question_reports", {
  id: uuid().primaryKey().defaultRandom(),
  questionId: uuid("question_id")
    .references(() => questions.id)
    .notNull(),
  reportedBy: uuid("reported_by")
    .references(() => userProfiles.id)
    .notNull(),
  reason: text({
    enum: [
      "incorrect_answer",
      "unclear_question",
      "typo",
      "outdated",
      "broken_media",
      "other",
    ],
  }).notNull(),
  details: text(),
  status: text({ enum: ["pending", "reviewing", "resolved", "dismissed"] })
    .notNull()
    .default("pending"),
  resolution: text(),
  resolvedBy: uuid("resolved_by").references(() => userProfiles.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

##### Tasks

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

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types are correct
- Unit test: Verify reason enum values
- Unit test: Verify status enum values

---

#### Phase 5.2: Database Schema - Question Performance

**Goal**: Create table for aggregated question-level statistics.

##### Database Schema

```typescript
export const questionPerformance = pgTable("question_performance", {
  id: uuid().primaryKey().defaultRandom(),
  questionId: uuid("question_id")
    .references(() => questions.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  totalAttempts: integer("total_attempts").notNull().default(0),
  correctAttempts: integer("correct_attempts").notNull().default(0),
  avgTimeSeconds: integer("avg_time_seconds"),
  reportCount: integer("report_count").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

##### Tasks

1. **Add questionPerformance table to schema**
   - Define table in `/src/db/schema.ts`
   - One-to-one with questions
   - Track aggregate statistics

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `QuestionPerformance`, `NewQuestionPerformance` types

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types
- Unit test: Verify unique constraint on questionId
- Unit test: Verify cascade delete

---

#### Phase 5.3: Database Schema - Revenue Records

**Goal**: Create table for tracking revenue from subscriptions.

##### Database Schema

```typescript
export const revenueRecords = pgTable("revenue_records", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  deckId: uuid("deck_id")
    .references(() => decks.id)
    .notNull(),
  subscriptionId: uuid("subscription_id")
    .references(() => subscriptions.id)
    .notNull(),
  stripeInvoiceId: text("stripe_invoice_id").notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  grossAmountCents: integer("gross_amount_cents").notNull(),
  platformFeeCents: integer("platform_fee_cents").notNull(), // 30%
  netAmountCents: integer("net_amount_cents").notNull(), // 70%
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

##### Tasks

1. **Add revenueRecords table to schema**
   - Define table in `/src/db/schema.ts`
   - Store gross, platform fee (30%), and net (70%) amounts
   - Link to organization, deck, and subscription

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `RevenueRecord`, `NewRevenueRecord` types

##### Files to Create/Modify

- `/src/db/schema.ts` (modify)

##### Testing

- Unit test: Verify schema types
- Unit test: Verify all foreign key references

---

#### Phase 5.4: Revenue Calculation Utilities

**Goal**: Create utility functions for revenue split calculations.

##### Tasks

1. **Create revenue calculation module**
   - Create `/src/lib/revenue.ts`
   - `calculatePlatformFee(grossCents)` - Calculate 30% platform fee
   - `calculateNetRevenue(grossCents)` - Calculate 70% publisher share
   - `formatRevenue(cents)` - Format cents as currency string

2. **Create revenue aggregation helpers**
   - `aggregateRevenueByPeriod(records, period)` - Group by day/week/month
   - `calculateTotalRevenue(orgId, dateRange)` - Sum for organization

##### Files to Create/Modify

- `/src/lib/revenue.ts` (create)

##### Testing

- Unit test: Platform fee is exactly 30%
- Unit test: Net revenue is exactly 70%
- Unit test: Calculations handle edge cases (0, small amounts)
- Unit test: Aggregation groups correctly

---

#### Phase 5.5: Update Question Performance on Answer

**Goal**: Update question performance statistics when learners answer.

##### Tasks

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

##### Files to Create/Modify

- `/src/lib/publisher/question-stats.ts` (create)
- `/src/routes/api.practice.$sessionId.submit.ts` (modify)

##### Testing

- Unit test: Creates record on first attempt
- Unit test: Updates existing record correctly
- Unit test: Running average calculation is accurate
- Unit test: Concurrent updates are handled

---

#### Phase 5.6: Create Revenue Record on Payment

**Goal**: Record revenue when subscription payments succeed.

##### Tasks

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

##### Files to Create/Modify

- `/src/lib/publisher/revenue-record.ts` (create)
- `/src/integrations/stripe/webhooks.ts` (modify)

##### Testing

- Unit test: Revenue record created with correct amounts
- Unit test: 70/30 split is accurate
- Unit test: Links to correct organization
- Unit test: Handles various invoice scenarios

---

#### Phase 5.7: Submit Question Report API

**Goal**: API endpoint for learners to report question issues.

##### API Endpoints

| Endpoint            | Method | Purpose             |
| ------------------- | ------ | ------------------- |
| `/api/reports/submit` | POST   | Submit question report |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.reports.submit.ts` (create)
- `/src/lib/validation/report.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 without subscription
- Unit test: Returns 400 for invalid reason
- Unit test: Returns 409 for duplicate pending report
- Unit test: Creates report successfully
- Unit test: Increments question report count

---

#### Phase 5.8: List Question Reports API

**Goal**: API endpoint for publishers to list reports for their questions.

##### API Endpoints

| Endpoint               | Method | Purpose            |
| ---------------------- | ------ | ------------------ |
| `/api/publisher/reports` | GET    | List question reports |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.publisher.reports.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for non-publishers
- Unit test: Returns 403 for non-members
- Unit test: Filters by status
- Unit test: Returns reports with question info
- Unit test: Pagination works correctly

---

#### Phase 5.9: View/Resolve Report API

**Goal**: API endpoints for viewing and resolving individual reports.

##### API Endpoints

| Endpoint                          | Method | Purpose        |
| --------------------------------- | ------ | -------------- |
| `/api/publisher/reports/:reportId` | GET    | View report    |
| `/api/publisher/reports/:reportId` | PUT    | Resolve report |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.publisher.reports.$reportId.ts` (create)
- `/src/lib/validation/report.ts` (modify)

##### Testing

- Unit test: GET returns 403 for non-members
- Unit test: GET returns full report details
- Unit test: PUT returns 403 for writers
- Unit test: PUT validates status transitions
- Unit test: PUT sets resolver info
- Unit test: PUT updates status correctly

---

#### Phase 5.10: Publisher Analytics Overview API

**Goal**: API endpoint for publisher dashboard statistics.

##### API Endpoints

| Endpoint                           | Method | Purpose                  |
| ---------------------------------- | ------ | ------------------------ |
| `/api/publisher/analytics/overview` | GET    | Publisher overview stats |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.publisher.analytics.overview.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for non-publishers
- Unit test: Returns correct totals
- Unit test: Returns deck breakdown
- Unit test: Handles org with no decks

---

#### Phase 5.11: Deck Performance Analytics API

**Goal**: API endpoint for deck-specific publisher analytics.

##### API Endpoints

| Endpoint                              | Method | Purpose          |
| ------------------------------------- | ------ | ---------------- |
| `/api/publisher/analytics/:deckId` | GET    | Deck performance |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.publisher.analytics.$deckId.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for non-members
- Unit test: Returns deck-specific stats
- Unit test: Returns topic breakdown
- Unit test: Returns pending reports count

---

#### Phase 5.12: Question-Level Analytics API

**Goal**: API endpoint for question performance statistics.

##### API Endpoints

| Endpoint                                        | Method | Purpose            |
| ----------------------------------------------- | ------ | ------------------ |
| `/api/publisher/analytics/:deckId/questions` | GET    | Question-level stats |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.publisher.analytics.$deckId.questions.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for non-members
- Unit test: Returns questions with stats
- Unit test: Sorting works correctly
- Unit test: Flags problematic questions

---

#### Phase 5.13: Subscriber Trends API

**Goal**: API endpoint for subscriber growth analytics.

##### API Endpoints

| Endpoint                                         | Method | Purpose          |
| ------------------------------------------------ | ------ | ---------------- |
| `/api/publisher/analytics/:deckId/subscribers` | GET    | Subscriber trends |

##### Tasks

1. **Create GET /api/publisher/analytics/:deckId/subscribers endpoint**
   - Create `/src/routes/api.publisher.analytics.$deckId.subscribers.ts`
   - Require authentication
   - Verify user has access to deck's org
   - Return subscriber count over time
   - Return new subscribers by period (day/week/month)
   - Return churn rate (cancellations)
   - Return active vs total subscribers
   - Return breakdown by billing interval (monthly/yearly)

##### Files to Create/Modify

- `/src/routes/api.publisher.analytics.$deckId.subscribers.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for non-members
- Unit test: Returns subscriber trends
- Unit test: Calculates churn rate correctly
- Unit test: Returns billing interval breakdown

---

#### Phase 5.14: Revenue Summary API

**Goal**: API endpoint for revenue analytics.

##### API Endpoints

| Endpoint                  | Method | Purpose         |
| ------------------------- | ------ | --------------- |
| `/api/publisher/revenue` | GET    | Revenue summary |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.publisher.revenue.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for non-owners
- Unit test: Returns correct revenue totals
- Unit test: Returns deck breakdown
- Unit test: Respects date range filter

---

#### Phase 5.15: Revenue Export API

**Goal**: API endpoint for exporting revenue data as CSV.

##### API Endpoints

| Endpoint                        | Method | Purpose           |
| ------------------------------- | ------ | ----------------- |
| `/api/publisher/revenue/export` | GET    | Export revenue CSV |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/api.publisher.revenue.export.ts` (create)
- `/src/lib/csv.ts` (create)

##### Testing

- Unit test: Returns 401 when not authenticated
- Unit test: Returns 403 for non-owners
- Unit test: Generates valid CSV
- Unit test: CSV headers match expected format
- Unit test: Special characters are escaped

---

#### Phase 5.16: Report Question Modal Component

**Goal**: Modal component for learners to report question issues.

##### Tasks

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

##### Files to Create/Modify

- `/src/components/practice/ReportQuestionModal.tsx` (create)
- `/src/components/practice/QuestionDisplay.tsx` (modify)

##### Testing

- Unit test: Modal renders with reason options
- Unit test: Submit calls API with correct data
- Unit test: Shows success message on completion
- Unit test: Shows error on failure
- E2E test: Report question during practice

---

#### Phase 5.17: Publisher Dashboard Page

**Goal**: Main analytics dashboard for publishers.

##### UI Routes

| Route                    | Purpose             |
| ------------------------ | ------------------- |
| `/publisher/analytics` | Publisher dashboard |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/publisher/analytics/index.tsx` (create)
- `/src/components/publisher/DashboardStats.tsx` (create)

##### Testing

- Unit test: Shows overview statistics
- Unit test: Shows deck breakdown
- Unit test: Pending reports badge appears
- E2E test: View publisher dashboard

---

#### Phase 5.18: Deck Analytics Page

**Goal**: Detailed analytics page for a specific deck.

##### UI Routes

| Route                                  | Purpose        |
| -------------------------------------- | -------------- |
| `/publisher/analytics/:deckId` | Deck analytics |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/publisher/analytics/$deckId/index.tsx` (create)
- `/src/components/publisher/SubscriberChart.tsx` (create)

##### Testing

- Unit test: Shows deck-specific stats
- Unit test: Subscriber chart renders correctly
- Unit test: Date range filter works
- E2E test: View deck analytics

---

#### Phase 5.19: Question Performance Page

**Goal**: Page showing performance statistics for each question.

##### UI Routes

| Route                                           | Purpose              |
| ----------------------------------------------- | -------------------- |
| `/publisher/analytics/:deckId/questions` | Question performance |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/publisher/analytics/$deckId/questions.tsx` (create)
- `/src/components/publisher/QuestionPerformanceTable.tsx` (create)

##### Testing

- Unit test: Table renders all questions
- Unit test: Sorting works correctly
- Unit test: Filtering by topic works
- Unit test: Problematic questions highlighted
- E2E test: View question performance

---

#### Phase 5.20: Subscriber Analytics Page

**Goal**: Page showing detailed subscriber information.

##### UI Routes

| Route                                            | Purpose              |
| ------------------------------------------------ | -------------------- |
| `/publisher/analytics/:deckId/subscribers` | Subscriber analytics |

##### Tasks

1. **Create subscriber analytics page**
   - Create `/src/routes/publisher/analytics/$deckId/subscribers.tsx`
   - Subscriber growth chart
   - New subscribers vs churned chart
   - Billing interval breakdown (pie chart)
   - Subscriber retention metrics
   - No individual subscriber data (privacy)

##### Files to Create/Modify

- `/src/routes/publisher/analytics/$deckId/subscribers.tsx` (create)

##### Testing

- Unit test: Shows subscriber metrics
- Unit test: Charts render correctly
- Unit test: No individual data exposed
- E2E test: View subscriber analytics

---

#### Phase 5.21: Reports List Page

**Goal**: Page listing all question reports for publisher review.

##### UI Routes

| Route                  | Purpose      |
| ---------------------- | ------------ |
| `/publisher/reports` | Reports list |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/publisher/reports/index.tsx` (create)
- `/src/components/publisher/ReportCard.tsx` (create)

##### Testing

- Unit test: Shows all reports
- Unit test: Filters by status
- Unit test: Quick actions work
- E2E test: View reports list

---

#### Phase 5.22: Report Detail Page

**Goal**: Page showing full report details with resolution form.

##### UI Routes

| Route                            | Purpose       |
| -------------------------------- | ------------- |
| `/publisher/reports/:reportId` | Report detail |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/publisher/reports/$reportId.tsx` (create)
- `/src/components/publisher/ReportResolutionForm.tsx` (create)

##### Testing

- Unit test: Shows full report details
- Unit test: Resolution form validates input
- Unit test: Submit updates report status
- E2E test: Resolve a report

---

#### Phase 5.23: Revenue Dashboard Page

**Goal**: Page showing revenue analytics and history.

##### UI Routes

| Route                 | Purpose           |
| --------------------- | ----------------- |
| `/publisher/revenue` | Revenue dashboard |

##### Tasks

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

##### Files to Create/Modify

- `/src/routes/publisher/revenue/index.tsx` (create)
- `/src/components/publisher/RevenueChart.tsx` (create)
- `/src/components/publisher/RevenueTable.tsx` (create)

##### Testing

- Unit test: Shows revenue totals
- Unit test: Chart renders correctly
- Unit test: Table shows transactions
- Unit test: Export button triggers download
- E2E test: View revenue dashboard

---

#### Phase 5.24: Publisher Navigation Updates

**Goal**: Update publisher navigation with analytics and reports links.

##### Tasks

1. **Update publisher layout navigation**
   - Modify `/src/routes/publisher.tsx`
   - Add Analytics link
   - Add Reports link with pending count badge
   - Add Revenue link (owner only)

2. **Create pending reports badge**
   - Fetch pending count on layout load
   - Display badge if count > 0
   - Update when reports are resolved

##### Files to Create/Modify

- `/src/routes/publisher.tsx` (modify)

##### Testing

- Unit test: Navigation shows all links
- Unit test: Reports badge shows count
- Unit test: Revenue link hidden for non-owners
- E2E test: Navigate between publisher sections

---

#### Phase 5.25: Email Notifications for Reports (Optional)

**Goal**: Send email notifications when questions are reported.

##### Tasks

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

##### Files to Create/Modify

- `/src/lib/email/notifications.ts` (create)
- `/src/routes/api.reports.submit.ts` (modify)

##### Testing

- Unit test: Email sent for new reports
- Unit test: Rate limiting prevents spam
- Unit test: Respects notification preferences

---

#### Phase 5.26: Question Performance Alerts

**Goal**: Alert publishers to problematic questions.

##### Tasks

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

##### Files to Create/Modify

- `/src/lib/publisher/question-alerts.ts` (create)
- `/src/routes/publisher/analytics/index.tsx` (modify)
- `/src/routes/publisher/analytics/$deckId/questions.tsx` (modify)

##### Testing

- Unit test: Detects too-hard questions
- Unit test: Detects too-easy questions
- Unit test: Detects reported questions
- Unit test: Alerts appear in UI

---

#### Phase 5.27: Analytics Data Caching

**Goal**: Improve analytics performance with caching.

##### Tasks

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

##### Files to Create/Modify

- `/src/lib/analytics/cache.ts` (create)
- `/src/db/schema.ts` (modify - add indexes)

##### Testing

- Unit test: Cache returns stored data
- Unit test: Cache invalidates correctly
- Performance test: Analytics pages load quickly

---

#### Phase 5 Verification Checklist

- [ ] Code coverage maintained at 70%+
- [ ] All database tables created and migrated
- [ ] Question performance updates on each answer
- [ ] Revenue records created on successful payments
- [ ] 70/30 revenue split is calculated correctly
- [ ] Learner can report question during practice
- [ ] Duplicate reports are prevented
- [ ] Publisher can view all reports for their questions
- [ ] Publisher can filter reports by status
- [ ] Publisher can resolve or dismiss reports
- [ ] Publisher dashboard shows overview statistics
- [ ] Deck analytics shows subscriber and revenue data
- [ ] Question performance table shows accuracy and attempts
- [ ] Problematic questions are flagged
- [ ] Subscriber analytics shows growth and churn
- [ ] Revenue dashboard shows gross/net breakdown
- [ ] Revenue can be exported as CSV
- [ ] Publisher navigation includes analytics and reports
- [ ] Pending reports count appears in navigation badge
- [ ] Revenue section restricted to organization owners

---

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
export type OrgRole = "owner" | "admin" | "editor" | "writer" | "viewer";

export const canEditDeck = (role: OrgRole) =>
  ["owner", "admin", "editor", "writer"].includes(role);

export const canPublishDeck = (role: OrgRole) =>
  ["owner", "admin", "editor"].includes(role);

export const canApproveQuestion = (role: OrgRole) =>
  ["owner", "admin", "editor"].includes(role);

export const canManageMembers = (role: OrgRole) =>
  ["owner", "admin"].includes(role);

export const canManageBilling = (role: OrgRole) => role === "owner";

export const canDeleteOrganization = (role: OrgRole) => role === "owner";

export const canViewDeckContent = async (
  userId: string,
  deckId: string,
  db: Database,
) => {
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.deckId, deckId),
      eq(subscriptions.status, "active"),
    ),
  });
  return !!subscription;
};
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
