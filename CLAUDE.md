# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                  # Start dev server on port 3000

# Testing
pnpm test                 # Run unit tests once
pnpm test:watch           # Run unit tests in watch mode
pnpm vitest run src/path/to/file.test.ts  # Run single test file
pnpm test:e2e             # Run Playwright e2e tests (starts dev server automatically)
pnpm test:e2e:ui          # Run e2e tests with Playwright UI

# Code quality
pnpm lint                 # Run ESLint
pnpm typecheck            # Run TypeScript type checking
pnpm check                # Run prettier --write and eslint --fix

# Database (Drizzle)
pnpm db:generate          # Generate migrations from schema changes
pnpm db:push              # Push schema to database (dev)
pnpm db:studio            # Open Drizzle Studio GUI

# Build
pnpm build                # Production build
```

## Architecture

This is a TanStack Start application with SSR support, using React 19 and the React Compiler.

### Key Technologies

- **Router**: TanStack Router with file-based routing in `src/routes/`
- **Data Fetching**: TanStack Query integrated with router SSR via `react-router-ssr-query`
- **Database**: Drizzle ORM with PostgreSQL - schema in `src/db/schema.ts`
- **Auth**: Clerk - provider wrapped at root level
- **i18n**: ParaglideJS with URL-based locale strategy - messages in `project.inlang/messages/`
- **Styling**: Tailwind CSS v4

### Database Validation

- Use Zod schemas for validating database records going in and coming out of the database
- Zod schemas are defined in `src/db/validators.ts` - co-located with the database schema for maintainability
- Always validate database records with Zod schemas instead of using type casting (`as`) or manual type guards
- This ensures runtime type safety and catches data inconsistencies early

### Project Structure

- `src/routes/` - File-based routes (TanStack Router). Files prefixed with `demo` are examples.
- `src/routes/demo/api.*.ts` - API route handlers (server functions)
- `src/integrations/` - Third-party integrations (Clerk, TanStack Query providers)
- `src/db/` - Drizzle schema and database connection
- `src/paraglide/` - Auto-generated i18n runtime (do not edit)
- `src/env.ts` - Type-safe environment variables via T3Env

### Server Entry

`src/server.ts` wraps the TanStack Start server handler with Paraglide middleware for URL localization.

### Testing Setup

- Unit tests use Vitest with jsdom and React Testing Library
- MSW (Mock Service Worker) is pre-configured for API mocking - add handlers in `src/test/mocks/handlers.ts`
- E2E tests use Playwright, configured to run against all major browsers

### Testing Guidelines

- Follow the AAA pattern: Arrange, Act, Assert
- Test user behavior, not implementation details
- Avoid mocking internal code; only mock third-party services and external APIs to prevent hitting external services

### Path Aliases

`@/*` maps to `./src/*`

### Environment Variables

- `VITE_CLERK_PUBLISHABLE_KEY` (required) - Clerk public key
- `DATABASE_URL` - PostgreSQL connection string

## Code Style

- Prefer pure functional programming
- One function or concern per file

### JSDoc Documentation

All functions must have JSDoc comments following this format:

```typescript
/**
 * ## functionName
 *
 * Describe what the function does and why it exists. Focus on the purpose and behavior,
 * not the implementation details. Explain the problem it solves or the role it plays.
 *
 * @example
 * const result = functionName(arg1, arg2)
 * console.log(result)
 *
 * @example
 * // Another example showing a different use case
 * functionName(specialCase)
 */
```

Guidelines:

- Start with an `##` heading containing the function name
- Describe **what** the function does and **why** it exists, not **how** it's implemented
- Include one or two `@example` blocks showing typical usage
- Do **not** include `@param` or `@return` tags
- Focus on the function's purpose and behavior from the caller's perspective

## Code Quality

The codebase has no existing lint errors, warnings, or failing tests. All new code must maintain this standard:

- Fix all lint errors and warnings
- Never disable or ignore lint rules
- Ensure all tests pass

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/) format for commit messages.

## Task Approach

Break tasks down into the smallest possible steps.
