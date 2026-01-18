# Phase 2: Question Decks and Content Management

> **See [00-overview.md](./00-overview.md) for project overview, codebase state, and quality requirements.**


**Goal**: Enable publishers to create and manage question decks with rich content.

**Coverage Target**: 70% minimum by end of phase.

**Note**: This platform targets professional certification exams (medical, legal, accounting, etc.), not software developers. The rich text editor supports formatted text, images, diagrams, tables, and mathematical equations - but NOT code blocks or syntax highlighting.

---

## Phase 2.1: Database Schema - Decks

**Goal**: Create the decks table for question collections.

### Database Schema

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

### Tasks

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

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types are correct
- Unit test: Verify status enum values

---

## Phase 2.2: Database Schema - Topics

**Goal**: Create the topics table for organizing questions within decks.

### Database Schema

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

### Tasks

1. **Add topics table to schema**
   - Define table in `/src/db/schema.ts`
   - Add cascade delete when deck is deleted

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `Topic`, `NewTopic` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify cascade delete behavior

---

## Phase 2.3: Database Schema - Questions and Answer Options

**Goal**: Create tables for questions and their answer options.

### Database Schema

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
  revisionRequested: boolean("revision_requested").notNull().default(false),
  currentVersion: integer("current_version").notNull().default(1),
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

### Tasks

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

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify question type enum values
- Unit test: Verify question status enum values

---

## Phase 2.4: Database Schema - Media Assets

**Goal**: Create table for tracking uploaded media files.

### Database Schema

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

### Tasks

1. **Add mediaAssets table to schema**
   - Define table in `/src/db/schema.ts`
   - Track file metadata and uploader

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

3. **Create type exports**
   - Export `MediaAsset`, `NewMediaAsset` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types

---

## Phase 2.5: Cloudflare R2 Integration

**Goal**: Set up S3-compatible storage for media uploads.

### Tasks

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

### Files to Create/Modify

- `/src/env.ts` (modify)
- `/src/integrations/r2/client.ts` (create)
- `/src/lib/upload.ts` (create)

### Dependencies

```bash
pnpm add @aws-sdk/client-s3
```

### Testing

- Unit test: Filename generation is unique
- Unit test: File type validation rejects non-images
- Unit test: File size validation enforces limits
- MSW: Mock S3 upload responses

---

## Phase 2.6: Media Upload API

**Goal**: API endpoint for uploading images to R2.

### API Endpoints

| Endpoint            | Method | Purpose           |
| ------------------- | ------ | ----------------- |
| `/api/media/upload` | POST   | Upload image file |

### Tasks

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

### Files to Create/Modify

- `/src/routes/api.media.upload.ts` (create)
- `/src/lib/validation/media.ts` (create)

### Testing

- Integration test: Returns 401 when not authenticated
- Integration test: Returns 403 when not org member
- Integration test: Returns 400 for invalid file type
- Integration test: Returns 400 for oversized file
- Integration test: Successfully uploads and returns URL
- Integration test: Upload creates mediaAsset record in database
- Integration test: Upload validates organization membership
- MSW: Mock R2 upload

---

## Phase 2.7: TipTap Editor Integration

**Goal**: Set up rich text editor with basic formatting.

### Tasks

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

### Files to Create/Modify

- `/src/integrations/tiptap/extensions.ts` (create)
- `/src/components/editor/RichTextEditor.tsx` (create)
- `/src/components/editor/EditorToolbar.tsx` (create)

### Dependencies

```bash
pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header @tiptap/extension-underline
```

### Testing

- Unit test: Editor renders with initial content
- Unit test: Editor emits onChange on edit
- Unit test: Toolbar buttons toggle formatting
- Unit test: Read-only mode prevents editing

---

## Phase 2.8: Image Upload in Editor

**Goal**: Enable image insertion in rich text editor.

### Tasks

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

### Files to Create/Modify

- `/src/components/editor/ImageUploader.tsx` (create)
- `/src/components/editor/ImageInsertModal.tsx` (create)
- `/src/components/editor/EditorToolbar.tsx` (modify)

### Testing

- Unit test: ImageUploader shows preview
- Unit test: ImageUploader calls upload API
- Unit test: Modal inserts image into editor
- E2E test: Upload and insert image

---

## Phase 2.9: KaTeX Math Equation Support

**Goal**: Enable mathematical equation rendering and editing.

### Tasks

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

### Files to Create/Modify

- `/src/integrations/tiptap/math-extension.ts` (create)
- `/src/components/editor/EquationEditor.tsx` (create)
- `/src/components/editor/EquationModal.tsx` (create)
- `/src/routes/__root.tsx` (modify - add KaTeX CSS)

### Dependencies

```bash
pnpm add katex @types/katex
```

### Testing

- Unit test: KaTeX renders valid LaTeX
- Unit test: KaTeX shows error for invalid LaTeX
- Unit test: Equation node stores LaTeX string
- Unit test: Modal inserts equation into editor

---

## Phase 2.10: Table Support in Editor

**Goal**: Enable table creation and editing.

### Tasks

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

### Files to Create/Modify

- `/src/integrations/tiptap/extensions.ts` (modify)
- `/src/components/editor/TableToolbar.tsx` (create)
- `/src/components/editor/TableInsertModal.tsx` (create)

### Testing

- Unit test: Table inserts with correct dimensions
- Unit test: Add row/column works
- Unit test: Delete row/column works
- Unit test: Tables render correctly in read-only

---

## Phase 2.11: Deck API - List/Create

**Goal**: API endpoints for listing and creating decks.

### API Endpoints

| Endpoint     | Method | Purpose               |
| ------------ | ------ | --------------------- |
| `/api/decks` | GET    | List decks for an org |
| `/api/decks` | POST   | Create new deck       |

### Tasks

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
   - Load organization settings (if exists)
   - Pre-fill pricing from organizational defaults (if set)
   - Create deck and return it
   - Note: Pricing defaults are pre-filled but editable

3. **Create validation schema**
   - Create `/src/lib/validation/deck.ts`
   - Define Zod schema for deck creation

### Files to Create/Modify

- `/src/routes/api.decks.ts` (create)
- `/src/lib/validation/deck.ts` (create)

### Testing

- Integration test: GET returns 400 without orgId
- Integration test: GET returns 403 for non-members
- Integration test: GET returns decks with counts
- Integration test: GET filters by status
- Integration test: POST creates deck successfully
- Integration test: POST generates unique slug
- Integration test: POST returns 403 for viewers
- Integration test: Deck creation with organization settings pre-fill
- Integration test: Deck list filters by status
- Integration test: Deck list includes question counts

---

## Phase 2.12: Deck API - Read/Update/Delete

**Goal**: API endpoints for single deck operations.

### API Endpoints

| Endpoint             | Method | Purpose     |
| -------------------- | ------ | ----------- |
| `/api/decks/:deckId` | GET    | Get deck    |
| `/api/decks/:deckId` | PUT    | Update deck |
| `/api/decks/:deckId` | DELETE | Delete deck |

### Tasks

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

### Files to Create/Modify

- `/src/routes/api.decks.$deckId.ts` (create)

### Testing

- Integration test: GET returns 403 for non-members
- Integration test: GET returns deck with details
- Integration test: PUT updates deck successfully
- Integration test: PUT returns 403 for viewers
- Integration test: DELETE returns 403 for non-admins
- Integration test: DELETE fails for published deck
- Integration test: DELETE succeeds for draft deck

---

## Phase 2.13: Deck Publish API

**Goal**: API endpoint for publishing a deck.

### API Endpoints

| Endpoint                   | Method | Purpose      |
| -------------------------- | ------ | ------------ |
| `/api/decks/:deckId/publish` | POST   | Publish deck |

### Tasks

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

### Files to Create/Modify

- `/src/routes/api.decks.$deckId.publish.ts` (create)

### Testing

- Integration test: Returns 403 for writers
- Integration test: Returns 400 if no approved questions
- Integration test: Returns 400 if no topics
- Integration test: Successfully publishes deck
- Integration test: Sets publishedAt timestamp
- Integration test: Publishing requires approved questions
- Integration test: Publishing requires topics
- Integration test: Publishing sets publishedAt timestamp

---

## Phase 2.13.1: Database Schema - Scheduled Publishing

**Goal**: Add scheduled publishing support to decks.

### Database Schema

```typescript
// /src/db/schema.ts
// Add to decks table:

scheduledPublishAt: timestamp("scheduled_publish_at"),
```

### Tasks

1. **Add scheduledPublishAt field to decks table**
   - Modify `/src/db/schema.ts`
   - Optional timestamp field
   - Nullable (only set when scheduled)

2. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify nullable field

---

## Phase 2.13.2: Scheduled Publishing API

**Goal**: API endpoints for scheduling deck publication.

### API Endpoints

| Endpoint                              | Method | Purpose                    |
| ------------------------------------- | ------ | -------------------------- |
| `/api/decks/:deckId/schedule`        | POST   | Schedule deck publication  |
| `/api/decks/:deckId/schedule`        | DELETE | Cancel scheduled publication |

### Tasks

1. **Create POST /api/decks/:deckId/schedule endpoint**
   - Create `/src/routes/api.decks.$deckId.schedule.ts`
   - Verify user has publish permission (editor+)
   - Validate scheduled date is in the future
   - Set `scheduledPublishAt` timestamp
   - Return updated deck

2. **Create DELETE /api/decks/:deckId/schedule endpoint**
   - Verify user has publish permission
   - Clear `scheduledPublishAt` field
   - Return updated deck

3. **Create validation schema**
   - Add to `/src/lib/validation/deck.ts`
   - Validate scheduled date is future date

### Files to Create/Modify

- `/src/routes/api.decks.$deckId.schedule.ts` (create)
- `/src/lib/validation/deck.ts` (modify)

### Testing

- Integration test: Returns 403 for writers
- Integration test: Validates future date
- Integration test: Sets scheduledPublishAt
- Integration test: DELETE clears scheduled date

---

## Phase 2.13.3: Scheduled Publishing Background Job

**Goal**: Automatically publish decks at their scheduled time.

### Tasks

1. **Create scheduled publishing job**
   - Create `/src/lib/jobs/scheduled-publish.ts`
   - Query decks where `scheduledPublishAt <= now()` and status is not published
   - For each deck, check if it meets publishing requirements:
     - Has at least one approved question
     - Has at least one topic
     - Has pricing set (if required)
   - If requirements met: publish deck (set status, publishedAt, clear scheduledPublishAt)
   - If requirements not met: skip and log warning
   - Create notification for publisher when deck is published

2. **Set up job scheduler**
   - Use cron job or similar (e.g., node-cron, BullMQ)
   - Run every hour (or configurable interval)
   - Create `/src/lib/jobs/index.ts` to register jobs

3. **Add job to deployment**
   - Ensure job runs in production environment
   - Handle job failures gracefully

### Files to Create/Modify

- `/src/lib/jobs/scheduled-publish.ts` (create)
- `/src/lib/jobs/index.ts` (create)

### Dependencies

```bash
pnpm add node-cron
# OR
pnpm add bullmq
```

### Testing

- Integration test: Job finds scheduled decks
- Integration test: Job publishes when requirements met
- Integration test: Job skips when requirements not met
- Integration test: Job creates notification
- Integration test: Schedule deck and verify it publishes
- Integration test: Job runs and publishes scheduled decks
- Integration test: Job creates notification on publish

---

## Phase 2.13.4: Scheduled Publishing UI

**Goal**: Interface for scheduling deck publication.

### Tasks

1. **Add schedule option to publish button**
   - Modify `/src/components/deck/DeckHeader.tsx`
   - Add "Schedule" option alongside "Publish"
   - Open modal for date selection

2. **Create SchedulePublishModal component**
   - Create `/src/components/deck/SchedulePublishModal.tsx`
   - Date/time picker
   - Show current scheduled date if exists
   - Cancel schedule button
   - Schedule button

3. **Update deck editor header**
   - Show scheduled date badge if scheduled
   - Allow canceling scheduled publication

### Files to Create/Modify

- `/src/components/deck/DeckHeader.tsx` (modify)
- `/src/components/deck/SchedulePublishModal.tsx` (create)

### Testing

- Unit test: Modal shows date picker
- Unit test: Schedule button validates future date
- Unit test: Cancel schedule clears date
- E2E test: Schedule deck for future date

---

## Phase 2.14: Topics API

**Goal**: API endpoints for managing topics within a deck.

### API Endpoints

| Endpoint                           | Method | Purpose      |
| ---------------------------------- | ------ | ------------ |
| `/api/decks/:deckId/topics`        | GET    | List topics  |
| `/api/decks/:deckId/topics`        | POST   | Create topic |
| `/api/decks/:deckId/topics/:topicId` | PUT    | Update topic |
| `/api/decks/:deckId/topics/:topicId` | DELETE | Delete topic |

### Tasks

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

### Files to Create/Modify

- `/src/routes/api.decks.$deckId.topics.ts` (create)
- `/src/routes/api.decks.$deckId.topics.$topicId.ts` (create)
- `/src/routes/api.decks.$deckId.topics.reorder.ts` (create)
- `/src/lib/validation/topic.ts` (create)

### Testing

- Integration test: GET returns topics in order
- Integration test: POST creates with correct sortOrder
- Integration test: PUT updates topic
- Integration test: DELETE removes topic
- Integration test: Reorder updates all sortOrders

---

## Phase 2.15: Questions API - List/Create

**Goal**: API endpoints for listing and creating questions.

### API Endpoints

| Endpoint                       | Method | Purpose          |
| ------------------------------ | ------ | ---------------- |
| `/api/decks/:deckId/questions` | GET    | List questions   |
| `/api/decks/:deckId/questions` | POST   | Create question  |

### Tasks

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

### Files to Create/Modify

- `/src/routes/api.decks.$deckId.questions.ts` (create)
- `/src/lib/validation/question.ts` (create)

### Testing

- Integration test: GET returns questions with options
- Integration test: GET filters by topic
- Integration test: GET filters by status
- Integration test: GET paginates correctly
- Integration test: POST creates question and options
- Integration test: POST validates correct answer exists
- Integration test: POST sets createdBy
- Integration test: Question creation with answer options
- Integration test: Question list filters by topic and status
- Integration test: Question pagination

---

## Phase 2.16: Questions API - Read/Update/Delete

**Goal**: API endpoints for single question operations.

### API Endpoints

| Endpoint                   | Method | Purpose         |
| -------------------------- | ------ | --------------- |
| `/api/questions/:questionId` | GET    | Get question    |
| `/api/questions/:questionId` | PUT    | Update question |
| `/api/questions/:questionId` | DELETE | Delete question |

### Tasks

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

### Files to Create/Modify

- `/src/routes/api.questions.$questionId.ts` (create)

### Testing

- Integration test: GET returns 403 for non-members
- Integration test: GET returns question with all data
- Integration test: PUT updates question and options
- Integration test: PUT resets approved status on edit
- Integration test: DELETE removes question

---

## Phase 2.16.1: Database Schema - Question Versions

**Goal**: Track question version history and invalidation.

### Database Schema

```typescript
// /src/db/schema.ts

export const questionVersions = pgTable("question_versions", {
  id: uuid().primaryKey().defaultRandom(),
  questionId: uuid("question_id")
    .references(() => questions.id, { onDelete: "cascade" })
    .notNull(),
  versionNumber: integer("version_number").notNull(),
  content: jsonb().notNull(),
  explanation: jsonb(),
  changeExplanation: text("change_explanation"),
  invalidatedAttempts: boolean("invalidated_attempts").notNull().default(false),
  createdBy: uuid("created_by")
    .references(() => userProfiles.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Add to questions table:
currentVersion: integer("current_version").notNull().default(1),
```

### Tasks

1. **Add questionVersions table to schema**
   - Define table in `/src/db/schema.ts`
   - Track content snapshots
   - Track invalidation decisions

2. **Add currentVersion field to questions table**
   - Modify `/src/db/schema.ts`
   - Track current version number

3. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

4. **Create type exports**
   - Export `QuestionVersion`, `NewQuestionVersion` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify cascade delete
- Unit test: Verify version number increments

---

## Phase 2.16.2: Question Version Control API

**Goal**: API endpoints for updating questions with version control and invalidation.

### API Endpoints

| Endpoint                        | Method | Purpose                    |
| ------------------------------- | ------ | -------------------------- |
| `/api/questions/:questionId`  | PUT    | Update question (enhanced) |
| `/api/questions/:questionId/versions` | GET | List question versions |

### Tasks

1. **Enhance PUT /api/questions/:questionId endpoint**
   - Modify `/src/routes/api.questions.$questionId.ts`
   - Add `invalidatePreviousAttempts` boolean field to request body
   - Add `changeExplanation` text field to request body
   - When updating:
     - Create new version record with current content
     - Increment `currentVersion`
     - If `invalidatePreviousAttempts` is true:
       - Mark related `questionAttempts` as invalidated
       - Update analytics to exclude invalidated attempts
   - Reset status to draft if approved question is edited
   - Update question content and options

2. **Create GET /api/questions/:questionId/versions endpoint**
   - Create `/src/routes/api.questions.$questionId.versions.ts`
   - Verify user is member of question's deck's org
   - Return all versions with change explanations
   - Order by version number descending

3. **Create invalidation helper**
   - Create `/src/lib/questions/invalidation.ts`
   - `invalidateQuestionAttempts(questionId)` - Mark attempts as invalidated
   - `recalculateAnalytics(questionId)` - Recalculate performance excluding invalidated attempts

4. **Update validation schema**
   - Modify `/src/lib/validation/question.ts`
   - Add optional `invalidatePreviousAttempts` boolean
   - Add optional `changeExplanation` string

### Files to Create/Modify

- `/src/routes/api.questions.$questionId.ts` (modify)
- `/src/routes/api.questions.$questionId.versions.ts` (create)
- `/src/lib/questions/invalidation.ts` (create)
- `/src/lib/validation/question.ts` (modify)

### Testing

- Integration test: PUT creates version record
- Integration test: PUT increments version number
- Integration test: PUT invalidates attempts when requested
- Integration test: PUT stores change explanation
- Integration test: GET returns all versions
- Integration test: Invalidated attempts excluded from analytics
- Integration test: Version creation on question update
- Integration test: Attempt invalidation when requested
- Integration test: Version history retrieval

---

## Phase 2.16.3: Question Version Control UI

**Goal**: Interface for updating questions with version control options.

### Tasks

1. **Update question edit form**
   - Modify `/src/components/question/QuestionForm.tsx`
   - Add checkbox: "Invalidate previous attempts"
   - Add textarea: "Change explanation" (shown when checkbox checked)
   - Show warning when invalidating attempts

2. **Create QuestionVersionHistory component**
   - Create `/src/components/question/QuestionVersionHistory.tsx`
   - Display version history
   - Show version number, date, creator, change explanation
   - Highlight current version

3. **Add version history to question editor**
   - Modify `/src/routes/publisher/decks/$deckId/questions/$questionId.tsx`
   - Add "Version History" tab or section
   - Display version history component

### Files to Create/Modify

- `/src/components/question/QuestionForm.tsx` (modify)
- `/src/components/question/QuestionVersionHistory.tsx` (create)
- `/src/routes/publisher/decks/$deckId/questions/$questionId.tsx` (modify)

### Testing

- Unit test: Form shows invalidation checkbox
- Unit test: Change explanation shown when checkbox checked
- Unit test: Version history displays correctly
- E2E test: Update question with invalidation

---

## Phase 2.17: Question Approval API

**Goal**: API endpoint for approving questions.

### API Endpoints

| Endpoint                          | Method | Purpose          |
| --------------------------------- | ------ | ---------------- |
| `/api/questions/:questionId/approve` | POST   | Approve question |
| `/api/questions/:questionId/reject`  | POST   | Reject to draft  |

### Tasks

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

### Files to Create/Modify

- `/src/routes/api.questions.$questionId.approve.ts` (create)
- `/src/routes/api.questions.$questionId.reject.ts` (create)
- `/src/routes/api.questions.$questionId.submit.ts` (create)

### Testing

- Integration test: Approve returns 403 for writers
- Integration test: Approve fails if not in review status
- Integration test: Approve sets all fields correctly
- Integration test: Reject resets status to draft
- Integration test: Submit sets status to review
- Integration test: Approval workflow (draft → review → approved)
- Integration test: Rejection resets to draft

---

## Phase 2.17.1: Database Schema - Question Comments

**Goal**: Create table for threaded comments on questions.

### Database Schema

```typescript
// /src/db/schema.ts

export const questionComments = pgTable("question_comments", {
  id: uuid().primaryKey().defaultRandom(),
  questionId: uuid("question_id")
    .references(() => questions.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => userProfiles.id, { onDelete: "cascade" })
    .notNull(),
  content: text().notNull(),
  parentCommentId: uuid("parent_comment_id").references(() => questionComments.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Add to questions table:
revisionRequested: boolean("revision_requested").notNull().default(false),
```

### Tasks

1. **Add questionComments table to schema**
   - Define table in `/src/db/schema.ts`
   - Support threaded comments (parentCommentId)
   - Track creator and timestamps

2. **Add revisionRequested field to questions table**
   - Modify `/src/db/schema.ts`
   - Boolean flag for revision requests

3. **Generate and run migration**
   - Run `pnpm db:generate`
   - Run `pnpm db:push`

4. **Create type exports**
   - Export `QuestionComment`, `NewQuestionComment` types

### Files to Create/Modify

- `/src/db/schema.ts` (modify)

### Testing

- Unit test: Verify schema types
- Unit test: Verify cascade delete
- Unit test: Verify parent comment reference

---

## Phase 2.17.2: Question Comments API

**Goal**: API endpoints for managing question comments.

### API Endpoints

| Endpoint                                    | Method | Purpose              |
| ------------------------------------------- | ------ | ------------------- |
| `/api/questions/:questionId/comments`     | GET    | List comments        |
| `/api/questions/:questionId/comments`      | POST   | Add comment          |
| `/api/questions/:questionId/comments/:commentId` | PUT    | Update comment       |
| `/api/questions/:questionId/comments/:commentId` | DELETE | Delete comment       |

### Tasks

1. **Create GET /api/questions/:questionId/comments endpoint**
   - Create `/src/routes/api.questions.$questionId.comments.ts`
   - Verify user is member of question's deck's org
   - Return comments with user info
   - Order by createdAt ascending
   - Include parent comment relationships

2. **Create POST /api/questions/:questionId/comments endpoint**
   - Verify user is member of question's deck's org
   - Verify user has appropriate role (writer, editor, admin)
   - Validate content is not empty
   - Create comment record
   - Create notification for:
     - Question creator (if commenter is editor/admin)
     - Editors/admins (if commenter is writer)
   - If comment is from editor/admin and question is in review: set `revisionRequested` to true

3. **Create PUT /api/questions/:questionId/comments/:commentId endpoint**
   - Verify comment belongs to current user
   - Update comment content
   - Update `updatedAt` timestamp

4. **Create DELETE /api/questions/:questionId/comments/:commentId endpoint**
   - Verify comment belongs to current user OR user is admin+
   - Delete comment (cascades to replies)

5. **Create validation schema**
   - Create `/src/lib/validation/comment.ts`
   - Define Zod schema for comment creation/update

### Files to Create/Modify

- `/src/routes/api.questions.$questionId.comments.ts` (create)
- `/src/lib/validation/comment.ts` (create)

### Testing

- Integration test: GET returns 403 for non-members
- Integration test: GET returns comments in order
- Integration test: POST creates comment and notification
- Integration test: POST sets revisionRequested when editor comments
- Integration test: PUT updates own comment
- Integration test: DELETE removes comment
- Integration test: Comment creation creates notification
- Integration test: Comment sets revisionRequested flag
- Integration test: Threaded comments (parentCommentId)

---

## Phase 2.17.3: Enhanced Review Workflow API

**Goal**: Enhance approval/rejection with revision requests.

### API Endpoints

| Endpoint                          | Method | Purpose                    |
| --------------------------------- | ------ | -------------------------- |
| `/api/questions/:questionId/reject` | POST | Reject with revision request |
| `/api/questions/:questionId/submit` | POST | Submit for review (enhanced) |

### Tasks

1. **Enhance POST /api/questions/:questionId/reject endpoint**
   - Modify `/src/routes/api.questions.$questionId.reject.ts`
   - Add optional `revisionRequested` boolean to request body
   - Add optional `rejectionReason` text field
   - If `revisionRequested` is true:
     - Set `revisionRequested` flag on question
     - Set status to draft
     - Create comment with rejection reason if provided
   - If `revisionRequested` is false:
     - Set status to draft (existing behavior)
   - Create notification for question creator

2. **Enhance POST /api/questions/:questionId/submit endpoint**
   - Modify `/src/routes/api.questions.$questionId.submit.ts`
   - Clear `revisionRequested` flag when submitting
   - Set status to review
   - Create notification for editors/admins

3. **Update notification creation**
   - Modify notification creation helpers
   - Include question and deck context in notifications

### Files to Create/Modify

- `/src/routes/api.questions.$questionId.reject.ts` (modify)
- `/src/routes/api.questions.$questionId.submit.ts` (modify)

### Testing

- Integration test: Reject with revisionRequested sets flag
- Integration test: Reject creates comment if reason provided
- Integration test: Submit clears revisionRequested flag
- Integration test: Notifications created correctly

---

## Phase 2.17.4: Question Comments UI

**Goal**: Interface for viewing and adding comments on questions.

### Tasks

1. **Create QuestionComments component**
   - Create `/src/components/question/QuestionComments.tsx`
   - Display threaded comments
   - Show commenter name, role, timestamp
   - Add comment form (if user has permission)
   - Reply to comment functionality
   - Edit/delete own comments

2. **Create CommentForm component**
   - Create `/src/components/question/CommentForm.tsx`
   - Textarea for comment content
   - Submit button
   - Cancel button (for replies)

3. **Create CommentItem component**
   - Create `/src/components/question/CommentItem.tsx`
   - Display single comment
   - Show user avatar, name, role badge
   - Show timestamp
   - Edit/delete buttons (if owner or admin)
   - Reply button
   - Nested replies display

4. **Add comments section to question editor**
   - Modify `/src/routes/publisher/decks/$deckId/questions/$questionId.tsx`
   - Add "Comments" tab or section
   - Display QuestionComments component

### Files to Create/Modify

- `/src/components/question/QuestionComments.tsx` (create)
- `/src/components/question/CommentForm.tsx` (create)
- `/src/components/question/CommentItem.tsx` (create)
- `/src/routes/publisher/decks/$deckId/questions/$questionId.tsx` (modify)

### Testing

- Unit test: Comments display correctly
- Unit test: Add comment works
- Unit test: Reply to comment works
- Unit test: Edit comment works
- Unit test: Delete comment works
- E2E test: Writer adds comment, editor responds

---

## Phase 2.17.5: Enhanced Review Workflow UI

**Goal**: Interface for rejection with revision requests.

### Tasks

1. **Update QuestionStatusActions component**
   - Modify `/src/components/question/QuestionStatusActions.tsx`
   - Add "Request Revision" option for editors/admins
   - Add rejection modal with:
     - Checkbox: "Request revision"
     - Textarea: "Reason for revision" (shown when checked)
     - Submit button

2. **Update question editor**
   - Show "Revision Requested" badge when flag is set
   - Highlight revision-requested questions in list
   - Show revision comments prominently

3. **Update question list**
   - Modify `/src/components/question/QuestionCard.tsx`
   - Show "Revision Requested" badge
   - Filter option for revision-requested questions

### Files to Create/Modify

- `/src/components/question/QuestionStatusActions.tsx` (modify)
- `/src/components/question/QuestionCard.tsx` (modify)

### Testing

- Unit test: Rejection modal shows revision option
- Unit test: Revision requested badge displays
- Unit test: Filter works correctly
- E2E test: Editor requests revision, writer addresses it

---

## Phase 2.18: Decks UI - List

**Goal**: Publisher page showing their organization's decks.

### UI Routes

| Route                   | Purpose    |
| ----------------------- | ---------- |
| `/publisher/decks` | List decks |

### Tasks

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

### Files to Create/Modify

- `/src/routes/publisher/decks/index.tsx` (create)
- `/src/components/deck/DeckCard.tsx` (create)

### Testing

- Unit test: DeckCard renders all info
- Unit test: DeckCard shows correct status badge
- E2E test: Publisher sees their decks

---

## Phase 2.19: Decks UI - Create

**Goal**: Form to create a new deck.

### UI Routes

| Route                   | Purpose          |
| ----------------------- | ---------------- |
| `/publisher/decks/new` | Create deck form |

### Tasks

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

### Files to Create/Modify

- `/src/routes/publisher/decks/new.tsx` (create)
- `/src/components/deck/DeckForm.tsx` (create)

### Testing

- Unit test: DeckForm validates title required
- Unit test: DeckForm shows slug preview
- Unit test: DeckForm handles image upload
- E2E test: Publisher creates new deck

---

## Phase 2.20: Deck Editor Layout

**Goal**: Layout for editing a deck with navigation tabs.

### UI Routes

| Route                        | Purpose            |
| ---------------------------- | ------------------ |
| `/publisher/decks/:deckId` | Deck editor layout |

### Tasks

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

### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId.tsx` (create)
- `/src/components/deck/DeckHeader.tsx` (create)

### Testing

- Unit test: Layout shows correct tabs
- Unit test: Publish button hidden for writers
- E2E test: Navigate between tabs

---

## Phase 2.21: Deck Settings UI

**Goal**: Settings page for deck metadata.

### UI Routes

| Route                                 | Purpose       |
| ------------------------------------- | ------------- |
| `/publisher/decks/:deckId/settings` | Deck settings |

### Tasks

1. **Create deck settings page**
   - Create `/src/routes/publisher/decks/$deckId/settings.tsx`
   - DeckForm in edit mode
   - Save button
   - Danger zone: archive/delete deck

2. **Add archive functionality**
   - Archive button (for published decks)
   - Delete button (for draft decks only)
   - Confirmation modal

### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId/settings.tsx` (create)

### Testing

- Unit test: Form pre-fills with deck data
- Unit test: Delete only shown for drafts
- Unit test: Archive only shown for published
- E2E test: Update deck title

---

## Phase 2.22: Topics Management UI

**Goal**: Interface for managing deck topics.

### UI Routes

| Route                               | Purpose          |
| ----------------------------------- | ---------------- |
| `/publisher/decks/:deckId/topics` | Topic management |

### Tasks

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

### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId/topics.tsx` (create)
- `/src/components/deck/TopicList.tsx` (create)
- `/src/components/deck/AddTopicForm.tsx` (create)

### Testing

- Unit test: TopicList renders all topics
- Unit test: Drag and drop reorders topics
- Unit test: Delete removes topic
- E2E test: Add and reorder topics

---

## Phase 2.23: Questions List UI

**Goal**: Interface for listing and managing questions.

### UI Routes

| Route                                       | Purpose       |
| ------------------------------------------- | ------------- |
| `/publisher/decks/:deckId/questions` | Question list |

### Tasks

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

### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId/questions/index.tsx` (create)
- `/src/components/question/QuestionCard.tsx` (create)
- `/src/components/question/QuestionFilters.tsx` (create)

### Testing

- Unit test: QuestionCard renders correctly
- Unit test: Filters update query params
- Unit test: Pagination works
- E2E test: Filter questions by topic

---

## Phase 2.24: Question Editor UI - Create

**Goal**: Interface for creating new questions.

### UI Routes

| Route                                       | Purpose         |
| ------------------------------------------- | --------------- |
| `/publisher/decks/:deckId/questions/new` | Create question |

### Tasks

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

### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId/questions/new.tsx` (create)
- `/src/components/question/QuestionForm.tsx` (create)
- `/src/components/question/AnswerOptionsEditor.tsx` (create)

### Testing

- Unit test: QuestionForm validates required fields
- Unit test: AnswerOptionsEditor enforces minimums
- Unit test: Multiple select allows multiple correct
- E2E test: Create question with image and equation

---

## Phase 2.25: Question Editor UI - Edit

**Goal**: Interface for editing existing questions.

### UI Routes

| Route                                                   | Purpose       |
| ------------------------------------------------------- | ------------- |
| `/publisher/decks/:deckId/questions/:questionId` | Edit question |

### Tasks

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

### Files to Create/Modify

- `/src/routes/publisher/decks/$deckId/questions/$questionId.tsx` (create)
- `/src/components/question/QuestionStatusActions.tsx` (create)

### Testing

- Unit test: Form pre-fills with question data
- Unit test: Status actions match user role
- Unit test: Edit approved question shows warning
- E2E test: Edit question and change status

---

## Phase 2.26: Question Preview Component

**Goal**: Read-only display of questions for review and practice.

### Tasks

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

### Files to Create/Modify

- `/src/components/question/QuestionPreview.tsx` (create)
- `/src/components/question/QuestionWithAnswer.tsx` (create)

### Testing

- Unit test: QuestionPreview renders content correctly
- Unit test: QuestionWithAnswer shows correct answers
- Unit test: Images and equations render in preview

---

## Phase 2.27: Update Coverage Threshold

**Goal**: Increase coverage requirement to 70% for subsequent phases.

### Tasks

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

### Files to Create/Modify

- `vitest.config.ts` (modify)
- `.github/workflows/ci.yml` (modify)

### Testing

- Verify CI fails if coverage drops below 70%

---

