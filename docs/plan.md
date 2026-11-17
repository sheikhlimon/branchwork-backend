# Implementation Plan: Branchwork Backend

Phased implementation roadmap for Branchwork. Each phase is developed on an isolated, short-named feature branch, verified with tests, and merged into `main`.

---

## Phase 0: Project Setup, Governance & ERD (`feat/setup`)
- [x] Create repository structure, `.gitignore`, and MIT `LICENSE`
- [x] Define C2 Container architecture and comprehensive ERD (`docs/architecture.md`)
- [x] Author operational handbook, Git rules, and scoping invariants (`AGENTS.md`)
- [x] Setup `package.json`, `tsconfig.json`, `nest-cli.json`, and dependencies
- [x] Configure modern toolchain: `oxlint`, `oxfmt` (double quotes), and `bun test`
- [x] Configure Docker containerization (`Dockerfile`, `compose.yaml`)
- [x] Setup application bootstrap with Swagger and ValidationPipe (`src/main.ts`, `src/app.module.ts`)
- [x] Merge into `main`

## Phase 1: Database Schema & Prisma (`feat/db-schema`)
- [x] Configure `prisma/schema.prisma` with PostgreSQL 16
- [x] Define models: `Organization`, `Branch`, `Role`, `User`, `Product`
- [x] Implement `PrismaService` and `PrismaModule`
- [x] Push schema to database (`npx prisma db push`)
- [x] Write integration tests for Prisma CRUD and cascade deletion (`src/prisma/prisma.service.spec.ts`)
- [x] Merge into `main`

## Phase 2: Authentication & Multi-Tenancy (`feat/auth`)
- [x] Implement `RegisterOrgDto` and `LoginDto` with `class-validator`
- [x] Create `AuthService` with `bcrypt` password hashing and JWT signing
- [x] Implement `POST /api/auth/register-org` (atomic transaction: Org + Owner)
- [x] Implement `POST /api/auth/login` (returns JWT with claims)
- [x] Implement `JwtAuthGuard` and `GET /api/auth/me`
- [x] Write automated tests for registration, login, and error boundaries (`src/auth/auth.spec.ts`)
- [x] Merge into `main`

## Phase 3: Branches, Roles & RBAC (`feat/rbac`)
- [x] Create `@RequireOwner()` and `@RequirePermission()` decorators
- [x] Implement `RolesGuard` checking owner claims and role permission JSON
- [x] Implement Branch CRUD (`/api/branches`) — Owner only
- [x] Implement Role CRUD with permission checklists (`/api/roles`)
- [x] Implement Staff management (`/api/staff`)
- [x] Write automated test suite verifying branches, roles, staff, and 403 Forbidden enforcement (`src/rbac/rbac.spec.ts`)
- [x] Merge into `main`

## Phase 4: Scoped Products & Inventory (`feat/products`)
- [x] Implement `CreateProductDto`, `OrganizeProductDto`, and `QueryProductsDto` with validation
- [x] Implement `POST /api/products` & `DELETE /api/products/:id` (Owner only)
- [x] Implement `GET /api/products` with automatic branch scoping:
  - Owner: Sees all products across the organization (optional `?branchId=` and `?search=`)
  - Staff: Automatically scoped to `user.branchId`
- [x] Implement `PATCH /api/products/:id/organize` (Staff with `organize_products` permission)
- [x] Write automated tests proving Staff cannot see or delete other branches' products (`src/products/products.spec.ts`)
- [x] Merge into `main`

## Phase 5: Demo Seed Data & Verification (`docs/seed-and-verify`)
- [x] Create `prisma/seed.ts` replicating exact prototype data:
  - Organization: **Padma Retail**
  - Owner: **Nadia Rahman** (`nadia@demo.com` / `demo123`)
  - Branches: **Dhanmondi**, **Gulshan**
  - Roles: **Branch manager**, **Stock clerk**
  - Staff: **Rafi Ahmed** (`rafi@demo.com` / `demo123` at Gulshan)
  - Products: **Mustard oil 1L** (Dhanmondi), **Basmati rice 5kg** (Gulshan), **Steel flask** (Gulshan)
- [x] Automated test suite passing 100% (31 tests across 5 test suites)
- [x] `oxlint` (0 errors, 0 warnings) and `oxfmt` (double quotes) verified
- [x] Update `README.md` with 2-minute reviewer quickstart and curl testing commands
- [x] Merge into `main`

---

## Phase 6: Migrations, Precision & Production Auth (`feat/migrations-and-precision`)
- [x] Upgrade `price Float` to `price Decimal @db.Decimal(10, 2)` in `prisma/schema.prisma`
- [x] Add `RefreshToken` model with `tokenHash`, `userId`, `expiresAt`, `revokedAt` in `prisma/schema.prisma`
- [x] Generate baseline database migration: `prisma/migrations/20261117_init/migration.sql`
- [x] Update `Dockerfile` to deploy migrations deterministically (`npx prisma migrate deploy && node dist/main`)
- [x] Implement production token rotation in `AuthService`:
  - Short-lived Access Token (15m) + Long-lived Refresh Token (7d)
  - `POST /api/auth/refresh` with token rotation and reuse detection
  - `POST /api/auth/logout` with session revocation
- [x] Implement `Decimal` price serialization to clean numbers in `ProductsService`
- [x] Implement relation aggregation check (`_count: { users: true, products: true }`) in `BranchesService`
- [x] Implement IAM delegation bounds (`assertCanAssignRole`) in `StaffService`
- [x] Expand automated test suite in `auth.spec.ts`, `products.spec.ts`, and `rbac.spec.ts`:
  - Token refresh, rotation, logout revocation, and reuse rejection
  - Exact currency decimal precision (no IEEE 754 drift)
  - Pre-delete branch conflict checks (`409 Conflict`)
  - Subordinate privilege escalation protection (`403 Forbidden`)
- [x] Verify `npm test` passes 100% and `npm run lint` has 0 errors
- [x] Merge into `main`

---

## Phase 7: Architecture Documentation & Streamlined README (`docs/streamline-and-adr`)
- [x] Update C2 Container diagram and ERD in `docs/architecture.md` to reflect `RefreshToken` and `Decimal(10, 2)`
- [x] Author Architecture Decision Records (ADRs) in `docs/architecture.md`:
  - **ADR-004:** Decimal Precision for Currency (`Decimal(10, 2)`)
  - **ADR-005:** Version-Controlled Migrations & Deterministic Deployments (`prisma migrate deploy`)
  - **ADR-006:** Production Token Rotation & Session Revocation
  - **ADR-007:** IAM Delegation Ceilings & Pre-Delete Relation Aggregations
- [x] Streamline `README.md` (no horizontal rules `---`, no tool formatting trivia, no messy curl dumps):
  - Hero overview & Swagger link (`http://localhost:3000/api/docs`)
  - Core security & scoping rules upfront
  - 2-Minute Quickstart (`pnpm prisma migrate deploy` + `pnpm run seed`)
  - Pre-seeded evaluation credentials (Nadia Rahman & Rafi Ahmed)
  - Full API endpoint catalog table with access tiers
  - Scoping & Permission Behavior Matrix (replacing raw curls with a clean behavior table)
  - Automated test runner documentation (`pnpm test`)
- [x] Merge into `main`

---

## Phase 8: Toolchain Modernization (`chore/migrate-to-pnpm`)
- [x] Pin package manager to `pnpm@12.21.0` via `packageManager` and `engines`
- [x] Configure workspace build script execution policies in `pnpm-workspace.yaml` (`allowBuilds`)
- [x] Update `Dockerfile` to enable `corepack` and execute deterministic `--frozen-lockfile` builds
- [x] Eliminate phantom dependency leakage in TypeScript modules
- [x] Streamline operational handbook (`AGENTS.md`) and project quickstart (`README.md`)
- [x] Verify full integration test suite (50 passing tests) and container build output
- [x] Merge into `main`

