# Implementation Plan: Branchwork Backend

Phased implementation roadmap for Branchwork. Each phase is developed on an isolated, short-named feature branch and merged into `main`.

---

## Phase 0: Project Setup, Governance & ERD (`feat/setup`)
- [x] Create repository structure and `.gitignore`
- [x] Define C2 Container architecture and comprehensive ERD (`docs/architecture.md`)
- [x] Author operational handbook, Git rules, and scoping invariants (`AGENTS.md`)
- [x] Setup `package.json`, `tsconfig.json`, `nest-cli.json`, and dependencies
- [x] Configure Docker containerization (`Dockerfile`, `compose.yaml`)
- [x] Setup application bootstrap with Swagger and ValidationPipe (`src/main.ts`, `src/app.module.ts`)
- [x] Merge into `main`

## Phase 1: Database Schema & Prisma (`feat/db-schema`)
- [ ] Configure `prisma/schema.prisma` with SQLite & PostgreSQL compatibility
- [ ] Define models: `Organization`, `Branch`, `Role`, `User`, `Product`
- [ ] Implement `PrismaService` and `PrismaModule`
- [ ] Push schema to database (`npx prisma db push`)
- [ ] Merge into `main`

## Phase 2: Authentication & Multi-Tenancy (`feat/auth`)
- [ ] Implement `RegisterOrgDto` and `LoginDto` with `class-validator`
- [ ] Create `AuthService` with `bcrypt` password hashing and JWT signing
- [ ] Implement `POST /api/auth/register-org` (atomic transaction: Org + Owner)
- [ ] Implement `POST /api/auth/login` (returns JWT with claims)
- [ ] Implement `JwtAuthGuard` and `GET /api/auth/me`
- [ ] Merge into `main`

## Phase 3: Branches, Roles & RBAC (`feat/rbac`)
- [ ] Create `@Roles()` and `@Permissions()` decorators with `RolesGuard`
- [ ] Implement Branch CRUD (`/api/branches`) — Owner only
- [ ] Implement Role CRUD with permission checklists (`/api/roles`)
- [ ] Implement Staff assignment (`/api/staff`)
- [ ] Merge into `main`

## Phase 4: Scoped Products & Inventory (`feat/products`)
- [ ] Implement Product creation & deletion (Owner only)
- [ ] Implement `GET /api/products` with automatic branch scoping:
  - Owner: Sees all products across the organization
  - Staff: Automatically scoped to `user.branchId`
- [ ] Implement `PATCH /api/products/:id/organize` (Staff with `organize_products` permission)
- [ ] Merge into `main`

## Phase 5: Demo Seed Data & Verification (`docs/seed-and-verify`)
- [ ] Create `prisma/seed.ts` with demo accounts:
  - Nadia Rahman (Owner) at Padma Retail
  - Rafi Ahmed (Stock clerk) at Gulshan
- [ ] Verify all endpoints via Swagger UI at `/api/docs`
- [ ] Final `README.md` review and verification
- [ ] Merge into `main`
