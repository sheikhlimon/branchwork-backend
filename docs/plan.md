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
- [x] Configure `prisma/schema.prisma` with SQLite & PostgreSQL compatibility
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
