# AGENTS.md

Operational guidelines and architectural rules for Branchwork Backend.

## 1. Project Context & Toolchain
- **Domain:** Multi-tenant retail console backend with branch-scoped RBAC.
- **Runtime & Framework:** Node.js 24+ / TypeScript / NestJS.
- **Package Manager & Test Runner:** `npm` / Jest test runner.
- **Sub-Second Tooling:** `oxlint` (linter) + `oxfmt` (formatter with double quotes).
- **Database & ORM:** PostgreSQL 16 (via Docker / Podman or local service) via Prisma ORM.
- **Auth & Security:** JWT (Access Tokens) + bcrypt password hashing + NestJS Guards.
- **Documentation:** Interactive OpenAPI / Swagger UI at `/api/docs`.

## 2. Essential Commands
```bash
# Dependencies & Setup
npm install
npx prisma generate
npx prisma migrate deploy   # Apply migrations
npm run prisma:migrate      # Create and apply schema changes in dev

# Development & Testing
npm run start:dev          # Start NestJS in watch mode
npm run build              # Compile TypeScript production build
npm test                   # Run Jest unit/integration test suite
npm run lint               # Run oxlint
npm run format             # Format with oxfmt (double quotes)
npm run seed               # Seed demo data (Padma Retail, Nadia Rahman, Rafi Ahmed)

# Containers (Docker / Podman)
npm run docker:up          # Start PostgreSQL & API container
npm run docker:down        # Stop containers
```

## 3. Git & Branching Conventions
- **Branch Naming:** Keep branch names short and intuitive (`feat/<topic>`, `fix/<topic>`, `docs/<topic>`).
  Examples: `feat/db-schema`, `feat/auth`, `feat/rbac`, `feat/products`.
- **Commit Format:** Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- **Concise Commits:** Prefer a single clear subject line. Do not add long commit bodies unless extra architectural rationale is genuinely necessary.

## 4. Architecture & Separation of Concerns
```text
src/
├── auth/                  # JWT Strategy, AuthController, AuthService, Guards
├── branches/              # Branch CRUD and assignment
├── roles/                 # Dynamic role definitions and permission checklists
├── staff/                 # Staff invitations and role/branch bindings
├── products/              # Branch-scoped product catalog and inventory organize
├── prisma/                # PrismaService and database lifecycle
└── common/                # Shared decorators (@CurrentUser, @RequireOwner), Guards, DTOs
```
- **Controllers:** Handle HTTP request/response only. Validate inputs using DTOs with `class-validator`. Never write database queries directly in controllers.
- **Services:** Contain 100% of domain business logic. Call `PrismaService`.
- **Guards:** Determine *if* a request proceeds (`JwtAuthGuard`, `RolesGuard`). Do not mutate data inside guards.

## 5. Strict Security & Scoping Rules
1. **Tenant Isolation:** `organizationId` MUST ALWAYS come from the verified JWT token (`req.user.organizationId`). NEVER accept `organizationId` from client body or query params.
2. **Branch Scoping:** When `req.user.isOwner === false`, every product query MUST inject `branchId: req.user.branchId`. Staff can NEVER view or organize products belonging to other branches.
3. **Product Mutation Constraints:** Only `isOwner === true` can invoke `create` and `delete` on products. Staff with `organize_products` permission can only update `stock`, `category`, and branch assignment within their own branch.

## 6. Code Commenting Guidelines
- **Explain the *why*, not the *what*:** Do not write redundant comments that restate the code (e.g., `// find user by id` above `findUnique`). Only comment non-obvious business logic, security constraints (e.g. IAM delegation ceilings), or subtle edge cases.
- **Self-documenting code first:** Favor clear, intention-revealing variable and function names over explanatory comments.
- **Zero commented-out code:** Never leave dead or commented-out code blocks in the repository; rely on Git history instead.
- **No robotic AI comments:** Avoid AI-generated boilerplate docstrings or obvious section markers that add noise without insight.

## 7. Anti-Patterns Graveyard
- ❌ NEVER use `any` in TypeScript. Use strict interfaces, generics, or `unknown` with type guards.
- ❌ NEVER hardcode JWT secrets or passwords in application code. Use `ConfigService`.
- ❌ NEVER return raw database errors or unhandled 500 exceptions to the client.
- ❌ NEVER store plain-text passwords. Use `bcrypt.hash(password, 10)`.

## 8. Definition of Done (DoD)
- Every endpoint has a corresponding DTO with validation decorators.
- Zero `any` in TypeScript (`npm run lint` passes with 0 warnings).
- Scoping rules verified with automated tests (`npm test` passes).
- Code compiles cleanly with zero TypeScript errors (`npx tsc --noEmit`).
