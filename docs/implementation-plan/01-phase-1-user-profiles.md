# Phase 1: User Profiles and Organization Foundation

> **See [00-overview.md](./00-overview.md) for project overview, codebase state, and quality requirements.**


**Goal**: Establish user identity, roles, and organization structure.

**Coverage Target**: 50% minimum by end of phase.

---

## Phase 1.1: CI/CD Setup

**Goal**: Establish automated quality gates before writing feature code.

### Tasks

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

### Files to Create/Modify

- `.github/workflows/ci.yml` (create)
- `vitest.config.ts` (modify)

### Testing

- Verify workflow triggers on push and PR
- Verify all jobs complete successfully

---

## Phase 1.2: Database Schema - User Profiles

**Goal**: Create the user profiles table linked to Clerk authentication.

### Database Schema

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

### Tasks

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

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types are correct
- Unit test: Verify enum values

---

## Phase 1.3: User Profile API - Read/Create

**Goal**: API endpoints for getting and creating user profiles.

### API Endpoints

| Endpoint            | Method | Purpose                     |
| ------------------- | ------ | --------------------------- |
| `/api/user/profile` | GET    | Get current user's profile  |
| `/api/user/profile` | POST   | Create profile for new user |

### Tasks

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

### Files to Create/Modify

- `/src/lib/auth.ts` (create)
- `/src/routes/api.user.profile.ts` (create)

### Testing

- Unit test: getCurrentUser returns null when not authenticated (pure function)
- Unit test: getCurrentUser returns user when authenticated (pure function)
- Integration test: GET returns 401 when not authenticated
- Integration test: GET returns 404 when profile doesn't exist
- Integration test: GET returns profile when exists
- Integration test: POST creates profile successfully
- Integration test: POST returns 409 when profile already exists
- Integration test: GET endpoint with real database
- Integration test: POST endpoint creates profile and returns it
- Integration test: POST endpoint handles duplicate clerkId
- MSW handlers for Clerk auth

---

## Phase 1.4: User Profile API - Update

**Goal**: API endpoint for updating user profiles.

### API Endpoints

| Endpoint            | Method | Purpose                       |
| ------------------- | ------ | ----------------------------- |
| `/api/user/profile` | PUT    | Update current user's profile |

### Tasks

1. **Create PUT /api/user/profile endpoint**
   - Validate request body (displayName, avatarUrl optional)
   - Check user is authenticated
   - Check profile exists
   - Update profile and return it
   - Update `updatedAt` timestamp

2. **Create validation schemas**
   - Create `/src/lib/validation/user.ts`
   - Define Zod schema for profile update

### Files to Create/Modify

- `/src/routes/api.user.profile.ts` (modify)
- `/src/lib/validation/user.ts` (create)

### Testing

- Integration test: PUT returns 401 when not authenticated
- Integration test: PUT returns 404 when profile doesn't exist
- Integration test: PUT updates profile successfully
- Integration test: PUT validates input correctly

---

## Phase 1.5: Clerk Webhook Integration

**Goal**: Automatically sync user data when Clerk events occur.

### API Endpoints

| Endpoint              | Method | Purpose                     |
| --------------------- | ------ | --------------------------- |
| `/api/webhooks/clerk` | POST   | Handle Clerk webhook events |

### Tasks

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

### Files to Create/Modify

- `/src/env.ts` (modify)
- `/src/routes/api.webhooks.clerk.ts` (create)

### Dependencies

```bash
pnpm add svix
```

### Testing

- Integration test: Webhook rejects invalid signatures (or unit test with mocked verification)
- Integration test: Webhook handles user.created event
- Integration test: Webhook handles user.updated event
- Integration test: Webhook handles user.deleted event
- Integration test: Webhook ignores unknown events
- Integration test: Full webhook flow creates/updates/deletes profile
- Integration test: Webhook signature verification

---

## Phase 1.6: Onboarding UI

**Goal**: New user onboarding flow to choose learner or publisher role.

### UI Routes

| Route         | Purpose                               |
| ------------- | ------------------------------------- |
| `/onboarding` | New user selects learner or publisher |

### Tasks

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

### Files to Create/Modify

- `/src/routes/onboarding.tsx` (create)
- `/src/components/user/OnboardingForm.tsx` (create)
- `/src/routes/__root.tsx` (modify)

### Testing

- Unit test: OnboardingForm renders both options
- Unit test: OnboardingForm calls onSubmit with correct type
- E2E test: New user completes onboarding as learner
- E2E test: New user completes onboarding as publisher

---

## Phase 1.7: Profile Settings UI

**Goal**: Allow users to view and edit their profile.

### UI Routes

| Route               | Purpose               |
| ------------------- | --------------------- |
| `/settings/profile` | View and edit profile |

### Tasks

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

### Files to Create/Modify

- `/src/routes/settings.tsx` (create)
- `/src/routes/settings/profile.tsx` (create)
- `/src/components/user/ProfileForm.tsx` (create)

### Testing

- Unit test: ProfileForm renders with initial values
- Unit test: ProfileForm validates input
- Unit test: ProfileForm submits correctly
- E2E test: User updates display name

---

## Phase 1.8: Database Schema - Organizations

**Goal**: Create organizations and membership tables.

### Database Schema

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

### Tasks

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

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify role enum values

---

## Phase 1.9: Permissions System

**Goal**: Create authorization helpers for role-based access control.

### Tasks

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

### Files to Create/Modify

- `/src/lib/permissions.ts` (create)

### Testing

- Unit test: Each permission function with all roles
- Unit test: getUserOrgRole returns correct role
- Unit test: getUserOrgRole returns null for non-members
- Unit test: requireOrgRole throws for insufficient role

---

## Phase 1.10: Organization API - List/Create

**Goal**: API endpoints for listing and creating organizations.

### API Endpoints

| Endpoint             | Method | Purpose                   |
| -------------------- | ------ | ------------------------- |
| `/api/organizations` | GET    | List user's organizations |
| `/api/organizations` | POST   | Create new organization   |

### Tasks

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

### Files to Create/Modify

- `/src/routes/api.organizations.ts` (create)
- `/src/lib/slug.ts` (create)
- `/src/lib/validation/organization.ts` (create)

### Testing

- Integration test: GET returns empty array for user with no orgs
- Integration test: GET returns orgs with roles
- Integration test: POST creates org successfully
- Integration test: POST makes creator the owner
- Integration test: POST validates input
- Integration test: Organization creation with slug generation
- Integration test: Organization creation adds creator as owner
- Unit test: Slug generation handles special characters (pure function)
- Unit test: Slug generation handles duplicates (pure function)

---

## Phase 1.11: Organization API - Read/Update/Delete

**Goal**: API endpoints for single organization operations.

### API Endpoints

| Endpoint                    | Method | Purpose                  |
| --------------------------- | ------ | ------------------------ |
| `/api/organizations/:orgId` | GET    | Get organization details |
| `/api/organizations/:orgId` | PUT    | Update organization      |
| `/api/organizations/:orgId` | DELETE | Delete organization      |

### Tasks

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

### Files to Create/Modify

- `/src/routes/api.organizations.$orgId.ts` (create)

### Testing

- Integration test: GET returns 403 for non-members
- Integration test: GET returns org details for members
- Integration test: PUT returns 403 for insufficient role
- Integration test: PUT updates org successfully
- Integration test: DELETE returns 403 for non-owners
- Integration test: DELETE deletes org successfully

---

## Phase 1.12: Organization Members API

**Goal**: API endpoints for managing organization members.

### API Endpoints

| Endpoint                                      | Method | Purpose            |
| --------------------------------------------- | ------ | ------------------ |
| `/api/organizations/:orgId/members`           | GET    | List members       |
| `/api/organizations/:orgId/members`           | POST   | Add member         |
| `/api/organizations/:orgId/members/:memberId` | PUT    | Update member role |
| `/api/organizations/:orgId/members/:memberId` | DELETE | Remove member      |

### Tasks

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

### Files to Create/Modify

- `/src/routes/api.organizations.$orgId.members.ts` (create)
- `/src/routes/api.organizations.$orgId.members.$memberId.ts` (create)

### Testing

- Integration test: GET returns all members
- Integration test: POST adds member successfully
- Integration test: POST rejects duplicate members
- Integration test: POST rejects owner role
- Integration test: PUT updates role successfully
- Integration test: PUT cannot change owner role
- Integration test: DELETE removes member
- Integration test: DELETE cannot remove owner
- Integration test: Adding member creates organizationMembers record
- Integration test: Updating member role
- Integration test: Removing member

---

## Phase 1.13: Organizations UI - List

**Goal**: Publisher dashboard showing their organizations.

### UI Routes

| Route                      | Purpose            |
| -------------------------- | ------------------ |
| `/publisher/organizations` | List organizations |

### Tasks

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

### Files to Create/Modify

- `/src/routes/publisher.tsx` (create)
- `/src/routes/publisher/organizations/index.tsx` (create)
- `/src/components/organization/OrganizationCard.tsx` (create)

### Testing

- Unit test: OrganizationCard renders correctly
- Unit test: OrganizationCard shows correct role badge
- E2E test: Publisher sees their organizations

---

## Phase 1.14: Organizations UI - Create

**Goal**: Form to create a new organization.

### UI Routes

| Route                          | Purpose                  |
| ------------------------------ | ------------------------ |
| `/publisher/organizations/new` | Create organization form |

### Tasks

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

### Files to Create/Modify

- `/src/routes/publisher/organizations/new.tsx` (create)
- `/src/components/organization/OrganizationForm.tsx` (create)

### Testing

- Unit test: OrganizationForm validates name required
- Unit test: OrganizationForm shows slug preview
- E2E test: Publisher creates new organization

---

## Phase 1.15: Organizations UI - Dashboard & Settings

**Goal**: Organization dashboard and settings page.

### UI Routes

| Route                                      | Purpose                |
| ------------------------------------------ | ---------------------- |
| `/publisher/organizations/:orgId`          | Organization dashboard |
| `/publisher/organizations/:orgId/settings` | Organization settings  |

### Tasks

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

### Files to Create/Modify

- `/src/routes/publisher/organizations/$orgId.tsx` (create)
- `/src/routes/publisher/organizations/$orgId/index.tsx` (create)
- `/src/routes/publisher/organizations/$orgId/settings.tsx` (create)

### Testing

- Unit test: Dashboard shows correct info
- Unit test: Settings hidden for non-admins
- E2E test: Admin updates organization name
- E2E test: Owner deletes organization

---

## Phase 1.16: Organizations UI - Members

**Goal**: Member management interface.

### UI Routes

| Route                                     | Purpose        |
| ----------------------------------------- | -------------- |
| `/publisher/organizations/:orgId/members` | Manage members |

### Tasks

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

### Files to Create/Modify

- `/src/routes/publisher/organizations/$orgId/members.tsx` (create)
- `/src/components/organization/MemberList.tsx` (create)
- `/src/components/organization/AddMemberModal.tsx` (create)
- `/src/components/organization/RoleSelector.tsx` (create)

### Testing

- Unit test: MemberList renders all members
- Unit test: MemberList hides actions for viewers
- Unit test: AddMemberModal validates email
- Unit test: RoleSelector excludes owner
- E2E test: Admin adds new member
- E2E test: Admin changes member role
- E2E test: Admin removes member

---

## Phase 1.17: Database Schema - Notifications

**Goal**: Create notification system for team collaboration and workflow updates.

### Database Schema

```typescript
// /src/db/schema.ts

export const notifications = pgTable("notifications", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => userProfiles.id, { onDelete: "cascade" })
    .notNull(),
  type: text({
    enum: [
      "question_submitted_for_review",
      "question_comment_added",
      "question_revision_requested",
      "question_approved",
      "question_rejected",
      "deck_scheduled_published",
    ],
  }).notNull(),
  title: text().notNull(),
  message: text().notNull(),
  relatedQuestionId: uuid("related_question_id").references(() => questions.id, {
    onDelete: "cascade",
  }),
  relatedDeckId: uuid("related_deck_id").references(() => decks.id, {
    onDelete: "cascade",
  }),
  read: boolean().notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### Tasks

1. **Add notifications table to schema**
   - Define table in `/src/db/schema.ts`
   - Support various notification types
   - Link to related entities (questions, decks)

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `Notification`, `NewNotification` types
   - Export `NotificationType` enum type

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify enum values
- Unit test: Verify cascade delete behavior

---

## Phase 1.18: Database Schema - Organization Settings

**Goal**: Create table for organizational defaults (pricing, brand colors/logos).

### Database Schema

```typescript
// /src/db/schema.ts

export const organizationSettings = pgTable("organization_settings", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  defaultMonthlyPrice: integer("default_monthly_price"),
  defaultYearlyPrice: integer("default_yearly_price"),
  brandColorPrimary: text("brand_color_primary"),
  brandColorSecondary: text("brand_color_secondary"),
  brandLogoUrl: text("brand_logo_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

### Tasks

1. **Add organizationSettings table to schema**
   - Define table in `/src/db/schema.ts`
   - One-to-one relationship with organizations
   - Store pricing defaults and brand assets

2. **Update organizations table**
   - Add `logoUrl` field if not already present (for backward compatibility)
   - Note: Brand colors/logos are organizational-level, not deck-level

3. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

4. **Create type exports**
   - Export `OrganizationSettings`, `NewOrganizationSettings` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify unique constraint on organizationId
- Unit test: Verify cascade delete

---

## Phase 1.19: Organization Settings API

**Goal**: API endpoints for managing organizational defaults.

### API Endpoints

| Endpoint                              | Method | Purpose                    |
| ------------------------------------- | ------ | -------------------------- |
| `/api/organizations/:orgId/settings` | GET    | Get organization settings  |
| `/api/organizations/:orgId/settings` | PUT    | Update organization settings |

### Tasks

1. **Create GET /api/organizations/:orgId/settings endpoint**
   - Create `/src/routes/api.organizations.$orgId.settings.ts`
   - Verify user has admin+ role
   - Return settings or create default if not exists

2. **Create PUT /api/organizations/:orgId/settings endpoint**
   - Verify user has admin+ role
   - Validate request body (pricing must be positive integers if provided)
   - Create or update settings record
   - Update `updatedAt` timestamp

3. **Create validation schema**
   - Create `/src/lib/validation/organization-settings.ts`
   - Define Zod schema for settings update

### Files to Create/Modify

- `/src/routes/api.organizations.$orgId.settings.ts` (create)
- `/src/lib/validation/organization-settings.ts` (create)

### Testing

- Integration test: GET returns 403 for non-admins
- Integration test: GET returns settings or creates default
- Integration test: PUT validates pricing values
- Integration test: PUT updates settings successfully

---

## Phase 1.20: Organization Settings UI

**Goal**: Interface for managing organizational defaults.

### UI Routes

| Route                                         | Purpose                    |
| --------------------------------------------- | -------------------------- |
| `/publisher/organizations/:orgId/settings` | Organization settings page |

### Tasks

1. **Create organization settings page**
   - Create `/src/routes/publisher/organizations/$orgId/settings.tsx`
   - Require admin+ role
   - Display current settings
   - Form to update defaults

2. **Create OrganizationSettingsForm component**
   - Create `/src/components/organization/OrganizationSettingsForm.tsx`
   - Default monthly price input
   - Default yearly price input
   - Brand color pickers (primary, secondary)
   - Brand logo uploader
   - Save button with loading state

3. **Update organization creation**
   - Modify `/src/routes/publisher/organizations/new.tsx`
   - Optionally create default settings on org creation

### Files to Create/Modify

- `/src/routes/publisher/organizations/$orgId/settings.tsx` (create)
- `/src/components/organization/OrganizationSettingsForm.tsx` (create)
- `/src/routes/publisher/organizations/new.tsx` (modify)

### Testing

- Unit test: Settings form validates pricing
- Unit test: Settings form handles color inputs
- E2E test: Admin updates organization defaults

---

## Phase 1.21: Notifications API

**Goal**: API endpoints for managing user notifications.

### API Endpoints

| Endpoint              | Method | Purpose                    |
| --------------------- | ------ | -------------------------- |
| `/api/notifications`  | GET    | List user's notifications  |
| `/api/notifications/:notificationId/read` | PUT | Mark notification as read |
| `/api/notifications/read-all` | PUT | Mark all as read |

### Tasks

1. **Create GET /api/notifications endpoint**
   - Create `/src/routes/api.notifications.ts`
   - Require authentication
   - Return notifications for current user
   - Order by createdAt descending
   - Support pagination
   - Filter by read/unread status

2. **Create PUT /api/notifications/:notificationId/read endpoint**
   - Create `/src/routes/api.notifications.$notificationId.read.ts`
   - Require authentication
   - Verify notification belongs to current user
   - Mark notification as read
   - Return updated notification

3. **Create PUT /api/notifications/read-all endpoint**
   - Create `/src/routes/api.notifications.read-all.ts`
   - Require authentication
   - Mark all user's notifications as read
   - Return count of updated notifications

4. **Create notification helper**
   - Create `/src/lib/notifications.ts`
   - `createNotification(userId, type, title, message, relatedIds)` - Create notification
   - `notifyQuestionSubmitted(questionId, deckId)` - Notify editors/admins
   - `notifyCommentAdded(questionId, commentId, userId)` - Notify relevant users
   - `notifyRevisionRequested(questionId, deckId)` - Notify question creator

### Files to Create/Modify

- `/src/routes/api.notifications.ts` (create)
- `/src/routes/api.notifications.$notificationId.read.ts` (create)
- `/src/routes/api.notifications.read-all.ts` (create)
- `/src/lib/notifications.ts` (create)

### Testing

- Integration test: GET returns user's notifications
- Integration test: GET filters by read status
- Integration test: PUT marks notification as read
- Integration test: PUT read-all marks all as read
- Integration test: createNotification creates correct notification
- Integration test: notifyQuestionSubmitted notifies editors/admins

---

## Phase 1.22: Notifications UI

**Goal**: Interface for viewing and managing notifications.

### UI Routes

| Route              | Purpose              |
| ------------------ | -------------------- |
| `/notifications`   | Notifications page   |

### Tasks

1. **Create notifications page**
   - Create `/src/routes/notifications.tsx`
   - Require authentication
   - List all notifications
   - Show unread count badge
   - Mark as read on click
   - "Mark all as read" button
   - Filter by read/unread

2. **Create NotificationItem component**
   - Create `/src/components/notification/NotificationItem.tsx`
   - Display notification title and message
   - Show timestamp
   - Show unread indicator
   - Link to related entity (question, deck)
   - Mark as read on click

3. **Create NotificationBell component**
   - Create `/src/components/notification/NotificationBell.tsx`
   - Show unread count badge
   - Dropdown with recent notifications
   - Link to full notifications page

4. **Add notification bell to header**
   - Modify `/src/components/Header.tsx` or root layout
   - Add NotificationBell component
   - Show unread count

### Files to Create/Modify

- `/src/routes/notifications.tsx` (create)
- `/src/components/notification/NotificationItem.tsx` (create)
- `/src/components/notification/NotificationBell.tsx` (create)
- `/src/components/Header.tsx` (modify)

### Testing

- Unit test: NotificationItem displays correctly
- Unit test: NotificationBell shows unread count
- Unit test: Mark as read works
- E2E test: View notifications
- E2E test: Mark notification as read

---

## Phase 1.23: Navigation Updates

**Goal**: Update app navigation for learner/publisher paths.

### Tasks

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

### Files to Create/Modify

- `/src/routes/__root.tsx` (modify)
- `/src/components/ui/Breadcrumbs.tsx` (create)

### Testing

- Unit test: Nav shows correct items for learner
- Unit test: Nav shows correct items for publisher
- E2E test: Navigation works correctly

---

## Phase 1 Verification Checklist

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
- [ ] Set organization default pricing
- [ ] Set organization brand colors and logo
- [ ] Verify defaults pre-fill when creating new deck

---

