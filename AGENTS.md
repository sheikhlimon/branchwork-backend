# AGENTS.md

Operational guidelines and architectural invariants for Branchwork Backend.

## 1. Project Context & Stack
- **Domain:** Multi-tenant retail console backend with branch-scoped RBAC.
- **Runtime & Framework:** Node.js 26+ / TypeScript / NestJS.
- **Database & ORM:** SQLite (dev/test) / PostgreSQL (prod) via Prisma ORM.
- **Auth & Security:** JWT (Access Tokens) + bcrypt password hashing + NestJS Guards.
- **Documentation:** Interactive OpenAPI / Swagger UI at `/api`.

## 2. Essential Commands
```bash
# Dependencies & Setup
npm install
npx prisma generate
npx prisma db push

# Development & Testing
npm run start:dev          # Start NestJS in watch mode
npm run build              # Compile TypeScript production build
npm test                   # Run Jest unit/e2e tests
npm run seed               # Seed demo data (Padma Retail, Nadia Rahman, Rafi Ahmed)
npx prisma studio          # Open local Prisma DB browser GUI
```

## 3. Git & Branching Conventions
- **Branch Naming:** Keep branch names short and intuitive (`feat/<topic>`, `fix/<topic>`, `docs/<topic>`).
  Examples: `feat/db-schema`, `feat/auth`, `feat/rbac`, `feat/products`.
- **Commit Format:** Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- **Concise Commits:** Prefer a single clear subject line. Do not add long commit bodies unless extra architectural rationale is genuinely necessary.

## 4. Architecture & Separation of Concerns
```text
src/
├── auth/                  # JWT Strategy, AuthController, AuthService, Guards (@Roles, @Permissions)
├── organizations/         # Org tenant lifecycle and registration
├── branches/              # Branch CRUD and assignment
├── roles/                 # Dynamic role definitions and permission checklists
├── staff/                 # Staff invitations and role/branch bindings
├── products/              # Branch-scoped product catalog and inventory organize
├── prisma/                # PrismaService and database lifecycle
└── common/                # Shared decorators, DTOs, filters, and interceptors
```
- **Controllers:** Handle HTTP request/response only. Validate inputs using DTOs with `class-validator`. Never write database queries directly in controllers.
- **Services:** Contain 100% of domain business logic. Call `PrismaService`.
- **Guards:** Determine *if* a request proceeds (`JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`). Do not mutate data inside guards.

## 5. Strict Security & Scoping Invariants
1. **Tenant Isolation:** `organizationId` MUST ALWAYS come from the verified JWT token (`req.user.organizationId`). NEVER accept `organizationId` from client body or query params.
2. **Branch Scoping:** When `req.user.isOwner === false`, every product query MUST inject `branchId: req.user.branchId`. Staff can NEVER view or organize products belonging to other branches.
3. **Product Mutation Constraints:** Only `isOwner === true` can invoke `create` and `delete` on products. Staff with `organize_products` permission can only update `stock`, `category`, and branch assignment within their own branch.

## 6. Anti-Patterns Graveyard
- ❌ NEVER hardcode JWT secrets or passwords in application code. Use `ConfigService`.
- ❌ NEVER return raw database errors or unhandled 500 exceptions to the client.
- ❌ NEVER store plain-text passwords. Use `bcrypt.hash(password, 10)`.
- ❌ NEVER bypass the DTO layer. Every endpoint must declare a typed DTO.

## 7. Definition of Done (DoD)
- Every endpoint has a corresponding DTO with validation decorators.
- Scoping rules (Tenant & Branch) are verified with unit or e2e tests.
- Code compiles cleanly with zero TypeScript errors (`npm run build`).
- Clean branch merged into `main` with conventional commits.
