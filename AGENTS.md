# AGENTS.md

Operational guidelines and architectural rules for Branchwork Backend.

## 1. Critical Security Guardrails
1. **Tenant Isolation:** `organizationId` MUST ALWAYS come from the verified JWT token (`req.user.organizationId`). Never accept `organizationId` from client body or query params.
2. **Branch Scoping:** When `req.user.isOwner === false`, every product query MUST inject `branchId: req.user.branchId`. Staff can NEVER view or organize products belonging to other branches.
3. **Product Mutation:** Only `isOwner === true` can invoke `create` and `delete` on products. Staff with `organize_products` permission can only update stock, category, and branch assignment within their own branch.
4. **No `any`:** Never use `any` in TypeScript. Use strict interfaces, generics, or `unknown` with type guards.
5. **Secrets & Passwords:** Never hardcode secrets. Always use `ConfigService`. Passwords must be hashed with `bcrypt.hash(password, 10)`.

## 2. Essential Commands
```bash
# Setup & Database
pnpm install
pnpm prisma generate
pnpm prisma migrate deploy   # Apply migrations to database
pnpm prisma:migrate          # Create and apply schema changes in dev
pnpm run seed                # Seed demo retail data

# Development & Verification
pnpm run start:dev          # Start NestJS in watch mode
pnpm run typecheck          # Verify TypeScript compilation (tsc --noEmit)
pnpm run lint               # Run oxlint
pnpm run format             # Format code with oxfmt
pnpm test                   # Run automated Jest test suite
pnpm jest <path-to-spec>    # Run a single test file during active dev

# Containers
pnpm run docker:up          # Start PostgreSQL & API container
pnpm run docker:down        # Stop containers
```

## 3. Architecture & Code Conventions
* **Separation of Concerns:** Controllers handle HTTP transport and DTO validation. Services contain 100% of domain business logic and call `PrismaService`. Guards only determine request authorization.
* **Comment Guidelines:** Explain the *why*, not the *what*. Do not write comments that restate the code. Never leave commented-out dead code. Avoid AI-generated boilerplate docstrings.
* **Git Conventions:** Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`) with a single clear subject line. Short branch names (`feat/<topic>`, `fix/<topic>`).

## 4. Definition of Done (DoD)
- Every endpoint has a validated DTO (`class-validator`).
- TypeScript compiles cleanly with zero errors (`pnpm run typecheck`).
- Linter passes with zero warnings or errors (`pnpm run lint`).
- Automated tests pass against live PostgreSQL (`pnpm test`).
