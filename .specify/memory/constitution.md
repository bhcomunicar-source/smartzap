# SmartZap Constitution

## Core Principles

### I. Architecture Pattern

Every feature MUST follow the established layered architecture:

```
Page (thin) → Hook (controller) → Service (API client) → API Route → Database
```

- **Pages** (`app/(dashboard)/*/page.tsx`): Wire hooks to views only; no business logic
- **Hooks** (`hooks/use*.ts`): React Query + UI state management; controller pattern
- **Services** (`services/*Service.turso.ts`): API calls to Next.js routes
- **API Routes** (`app/api/*/route.ts`): Database operations via Turso
- **Rationale**: Separation of concerns enables testability, reusability, and maintainability

### II. View-Controller Separation

All feature components MUST separate presentation from logic:

- **Views** (`components/features/*/[Name]View.tsx`): Pure presentational; receive data/callbacks as props
- **Controller Hooks** (`hooks/use*Controller.ts`): Encapsulate React Query, derived state, event handlers
- **No mixed components**: A component is either a View OR uses a controller hook, never both
- **Rationale**: Pure views are reusable and testable; controller logic is isolated and replaceable

### III. API-First Design

All backend interactions MUST go through API routes:

- **No direct DB calls** from frontend components or hooks
- **Consistent endpoints**: RESTful patterns with `/api/[resource]/[action]`
- **Error handling**: Use `lib/whatsapp-errors.ts` mapping for WhatsApp API errors
- **Phone formatting**: All phone numbers MUST use E.164 format via `lib/phone-formatter.ts`
- **Rationale**: API layer provides security boundary, caching opportunities, and consistent error handling

### IV. Type Safety

TypeScript MUST be used with strict configuration:

- **No `any` types** except when interfacing with untyped external APIs (must be justified)
- **Central type definitions** in `types.ts` at project root
- **Zod validation** for API inputs via `lib/api-validation.ts`
- **Explicit return types** on all exported functions and hooks
- **Rationale**: Type safety catches errors at compile time and serves as documentation

### V. Simplicity & YAGNI

Features MUST start simple and grow only when justified:

- **No premature abstraction**: Implement the simplest solution that works
- **Three occurrences rule**: Abstract only after pattern appears three times
- **Complexity justification**: Any pattern beyond direct implementation requires documented rationale
- **Delete over deprecate**: Remove unused code rather than commenting or marking deprecated
- **Rationale**: Simpler code is easier to understand, maintain, and debug

## Technology Constraints

The following stack decisions are NON-NEGOTIABLE without constitutional amendment:

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Framework | Next.js | 16+ | App Router, Turbopack |
| UI | React | 19+ | React Compiler enabled |
| Styling | Tailwind CSS | 4+ | `primary-*` theme, `glass-panel` |
| Database | Turso | LibSQL | Via `lib/turso.ts` |
| Cache | Upstash Redis | REST API | Via `lib/redis.ts` |
| Queues | Upstash QStash | Workflows | For campaign processing |
| Icons | lucide-react | Latest | Exclusive icon library |
| Language | Portuguese (pt-BR) | - | All UI text |

**External API Constraints**:

- Meta WhatsApp Cloud API v24.0 - Template messages only
- Rate limits: 1 msg/6 sec to same user (error 131056)
- All 44 WhatsApp error codes mapped in `lib/whatsapp-errors.ts`

## Quality Standards

### Code Quality Gates

1. **ESLint**: `npm run lint` MUST pass with zero errors
2. **TypeScript**: `npm run build` MUST compile with zero errors
3. **Testing**: When tests exist, they MUST pass before merge

### File Organization

```
app/
├── (dashboard)/       # Authenticated routes
├── api/               # API Routes
components/
├── features/          # Feature-specific views
├── ui/                # Reusable UI components
hooks/                 # Controller hooks
services/              # API client services
lib/                   # Utilities and clients
types.ts               # Central type definitions
```

### Naming Conventions

- **Files**: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- **Hooks**: `use[Feature].ts` or `use[Feature]Controller.ts`
- **Services**: `[feature]Service.turso.ts`
- **Views**: `[Feature]View.tsx` or `[Feature]ListView.tsx`

## Governance

This constitution supersedes all other development practices in the SmartZap project.

**Version**: 1.0.0 | **Ratified**: 2025-12-02 | **Last Amended**: 2025-12-02
