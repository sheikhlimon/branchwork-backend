# Implementation Plan: Branchwork Backend

This document outlines the step-by-step phased roadmap for developing the Branchwork multi-tenant backend API. Each phase maps directly to an isolated Git feature branch.

---

## Phase 0: Project Setup, Governance & ERD
- [x] Create repository structure and `.gitignore`
- [x] Define C2 Container architecture and comprehensive ERD (`docs/architecture.md`)
- [x] Author operational handbook and scoping invariants (`AGENTS.md`)
- [x] Define phased execution plan (`docs/plan.md`)
- [ ] Initialize `package.json`, `tsconfig.json`, and NestJS dependencies
- [ ] Setup `.env.example` and core application bootstrap (`src/main.ts`, `src/app.module.ts`)
- [ ] Merge `feat/project-setup-and-docs` into `main`

## Phase 1: Database Schema & Prisma Configuration (`feat/database-schema`)
- [ ] Configure `prisma/schema.prisma` with SQLite provider (toggleable to PostgreSQL)
- [ ] Model `Organization` entity
- [ ] Model `Branch` entity with cascade on organization deletion
- [ ] Model `Role` entity with JSON permissions list
- [ ] Model `User` entity with `isOwner` flag, foreign keys to Branch and Role
- [ ] Model `Product` entity with unique SKU, price, stock, category, and branch binding
- [ ] Generate Prisma Client and run initial migration/push (`npx prisma db push`)
- [ ] Create `PrismaService` and `PrismaModule` for dependency injection
- [ ] Merge `feat/database-schema` into `main`

## Phase 2: Authentication & Organization Registration (`feat/auth-and-organization`)
- [ ] Implement `RegisterOrgDto` and `LoginDto` with `class-validator`
- [ ] Create `AuthService` with `bcrypt` password hashing
- [ ] Implement `POST /api/auth/register-org` (atomic transaction: creates Org + Owner user)
- [ ] Implement `POST /api/auth/login` (generates signed JWT with user claims)
- [ ] Implement `JwtStrategy` and `JwtAuthGuard`
- [ ] Implement `GET /api/auth/me` to return authenticated profile and permissions
- [ ] Write integration test for registration and login
- [ ] Merge `feat/auth-and-organization` into `main`

## Phase 3: Branches, Roles & Staff Management (`feat/branches-and-roles-rbac`)
- [ ] Implement `RolesGuard` and `PermissionsGuard` with custom metadata decorators (`@RequireRole`, `@RequirePermission`)
- [ ] Create `BranchesController` and `BranchesService` (CRUD for branches, Owner-only)
- [ ] Create `RolesController` and `RolesService` (CRUD for roles & permission checklist)
- [ ] Create `StaffController` and `StaffService` (invite/create staff assigned to branch and role)
- [ ] Write test ensuring non-owners cannot create branches or assign roles
- [ ] Merge `feat/branches-and-roles-rbac` into `main`

## Phase 4: Scoped Products & Inventory Management (`feat/products-and-inventory`)
- [ ] Create `ProductsController` and `ProductsService`
- [ ] Implement `POST /api/products` (Owner only: create product)
- [ ] Implement `DELETE /api/products/:id` (Owner only: delete product)
- [ ] Implement `GET /api/products` with automatic scoping:
  - If `isOwner`: Return all products across all branches (support `?branchId=` and `?search=`)
  - If Staff: Return ONLY products where `branchId == currentUser.branchId`
- [ ] Implement `PATCH /api/products/:id/organize` (allows updating `category`, `stock`, `branchId` if caller has `organize_products` permission on their own branch product)
- [ ] Write test verifying Staff cannot see other branches' products
- [ ] Merge `feat/products-and-inventory` into `main`

## Phase 5: Demo Seed Data, Swagger Docs & Verification (`feat/demo-seed-and-docs`)
- [ ] Create `prisma/seed.ts` matching exact screenshots:
  - Organization: **Padma Retail**
  - Owner: **Nadia Rahman** (`nadia@demo.com` / `demo123`)
  - Branches: **Dhanmondi**, **Gulshan**
  - Roles: **Branch manager**, **Stock clerk**
  - Staff: **Rafi Ahmed** (`rafi@demo.com` / `demo123` at Gulshan)
  - Products: **Mustard oil 1L** (Dhanmondi), **Basmati rice 5kg** (Gulshan), **Steel flask** (Gulshan)
- [ ] Configure `@nestjs/swagger` with OpenAPI interactive testing UI at `/api`
- [ ] Final end-to-end verification of all endpoints via Swagger
- [ ] Update `README.md` with 2-minute quickstart guide
- [ ] Merge `feat/demo-seed-and-docs` into `main`
