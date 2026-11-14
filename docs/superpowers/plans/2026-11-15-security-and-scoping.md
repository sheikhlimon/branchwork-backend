# Security and Scoping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix security vulnerabilities, scoping bypasses, and multi-tenancy edge cases identified in external code review on branch `fix/security-and-scoping`.

**Architecture:** Enforce strict branch membership guards in NestJS services, scope PostgreSQL SKU uniqueness to `organizationId`, replace fallback secrets with fail-fast `ConfigService.getOrThrow`, ensure case-insensitive searches with Prisma `mode: "insensitive"`, and handle foreign key constraint violations safely before deletion.

**Tech Stack:** Node.js 24+, TypeScript, NestJS 11, Prisma ORM, PostgreSQL 16, Jest.

**Spec:** [AGENTS.md](file:///home/limon/projects/branchwork-backend/AGENTS.md) and [architecture.md](file:///home/limon/projects/branchwork-backend/docs/architecture.md).

## Global Constraints

- Pure Node.js 24+ and npm runtime (no Bun).
- Strict types and zero `any` in TypeScript.
- PostgreSQL 16 compatibility (`mode: "insensitive"` on string filters).
- Tenant isolation: `organizationId` must always come from verified JWT claims.
- Staff scoping: Non-owners cannot access products outside their assigned `branchId`.
- No plain-text secrets or hardcoded fallback secrets.

## Review Focus

- Unassigned staff (`branchId: null`) accessing `GET /api/products`: expect `403 Forbidden`.
- Different organizations creating products with identical SKU (e.g. `OIL-001`): expect `201 Created` for both.
- Same organization creating duplicate SKU: expect `409 Conflict`.
- Deleting a branch with active products: expect `409 Conflict` (not unhandled `500`).
- Mixed-case search on product name/sku/category (e.g. `"oil"` matching `"Mustard Oil 1L"`): expect matching products returned.

---

### Task 1: Git Branch Setup

**Files:**
- Repository branch: `fix/security-and-scoping`

- [ ] **Step 1: Check out the new branch**
Run: `git checkout -b fix/security-and-scoping`
Expected: Switched to a new branch 'fix/security-and-scoping'

---

### Task 2: Multi-Tenant Composite SKU Uniqueness

**Files:**
- Modify: `prisma/schema.prisma:77-93`
- Modify: `src/products/products.service.ts:29-35`
- Test: `test/products.spec.ts`

**Interfaces:**
- Consumes: `Product` model in Prisma, `CreateProductDto`
- Produces: `@@unique([organizationId, sku])` constraint on `products` table

- [ ] **Step 1: Write test for cross-tenant duplicate SKU and same-tenant duplicate SKU**
In `test/products.spec.ts`, assert that two distinct organizations can create identical SKUs without conflict, while same organization throws `ConflictException`.

- [ ] **Step 2: Update `prisma/schema.prisma`**
Replace `sku String @unique` with `sku String` and add `@@unique([organizationId, sku])`.

- [ ] **Step 3: Update `src/products/products.service.ts`**
Change `findUnique` lookup:
```typescript
const existingSku = await this.prisma.product.findUnique({
  where: {
    organizationId_sku: {
      organizationId,
      sku: dto.sku.trim().toUpperCase(),
    },
  },
});
```

- [ ] **Step 4: Push database schema change**
Run: `npx prisma db push`
Expected: Prisma schema pushed to PostgreSQL database successfully.

- [ ] **Step 5: Verify tests pass**
Run: `npm test -- test/products.spec.ts`

- [ ] **Step 6: Commit**
`git commit -m "fix(products): scope SKU uniqueness to organization"`

---

### Task 3: Unassigned Staff Branch Scoping Guard

**Files:**
- Modify: `src/products/products.service.ts:58-69`
- Test: `test/products.spec.ts`

**Interfaces:**
- Consumes: `AuthenticatedUser` in `findAll`
- Produces: `ForbiddenException` when non-owner has `branchId === null`

- [ ] **Step 1: Write test for unassigned staff querying products**
In `test/products.spec.ts`, call `findAll` with `isOwner: false` and `branchId: null`. Expect `ForbiddenException`.

- [ ] **Step 2: Implement guard in `src/products/products.service.ts`**
```typescript
if (!user.isOwner && !user.branchId) {
  throw new ForbiddenException("Staff account is not assigned to an active branch");
}

const resolvedBranchId = user.isOwner ? query.branchId : user.branchId;
```

- [ ] **Step 3: Verify tests pass**
Run: `npm test -- test/products.spec.ts`

- [ ] **Step 4: Commit**
`git commit -m "fix(products): enforce branch assignment on staff catalog queries"`

---

### Task 4: Case-Insensitive Search on PostgreSQL

**Files:**
- Modify: `src/products/products.service.ts:70-78`
- Test: `test/products.spec.ts`

**Interfaces:**
- Consumes: `query.search`
- Produces: Prisma `contains` with `mode: "insensitive"`

- [ ] **Step 1: Update search query in `src/products/products.service.ts`**
```typescript
...(search
  ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ],
    }
  : {}),
```

- [ ] **Step 2: Add test asserting lowercase search matches mixed-case product**
Run: `npm test -- test/products.spec.ts`

- [ ] **Step 3: Commit**
`git commit -m "fix(products): enable case-insensitive search for postgresql"`

---

### Task 5: Safe Branch Deletion With Active Product Check

**Files:**
- Modify: `src/branches/branches.service.ts:34-46`
- Test: `test/rbac.spec.ts` or `test/branches.spec.ts`

**Interfaces:**
- Consumes: `branchId`, `organizationId`
- Produces: `ConflictException` when branch has active products

- [ ] **Step 1: Write test attempting to delete branch with active products**
Expect `ConflictException`.

- [ ] **Step 2: Implement check in `src/branches/branches.service.ts`**
```typescript
async delete(organizationId: string, branchId: string) {
  const branch = await this.prisma.branch.findFirst({
    where: { id: branchId, organizationId },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!branch) {
    throw new NotFoundException("Branch not found");
  }

  if (branch._count.products > 0) {
    throw new ConflictException(
      "Cannot delete branch with active products. Reassign or delete products first.",
    );
  }

  return this.prisma.branch.delete({
    where: { id: branch.id },
  });
}
```

- [ ] **Step 3: Verify tests pass**
Run: `npm test`

- [ ] **Step 4: Commit**
`git commit -m "fix(branches): prevent 500 by checking active products before branch deletion"`

---

### Task 6: Strict ConfigService Lookup for JWT Secret

**Files:**
- Modify: `src/auth/auth.module.ts:16-18`
- Modify: `src/auth/strategies/jwt.strategy.ts:23-25`
- Test: `test/auth.spec.ts`

**Interfaces:**
- Consumes: `ConfigService`
- Produces: `configService.getOrThrow<string>("JWT_SECRET")`

- [ ] **Step 1: Update `src/auth/auth.module.ts`**
Replace fallback string with `config.getOrThrow<string>("JWT_SECRET")`.

- [ ] **Step 2: Update `src/auth/strategies/jwt.strategy.ts`**
Replace fallback string with `configService.getOrThrow<string>("JWT_SECRET")`.

- [ ] **Step 3: Verify tests pass**
Run: `npm test -- test/auth.spec.ts`

- [ ] **Step 4: Commit**
`git commit -m "fix(auth): enforce strict JWT_SECRET configuration with getOrThrow"`

---

### Task 7: Staff Management Privilege Boundary

**Files:**
- Modify: `src/staff/staff.controller.ts:33-46`
- Modify: `src/staff/staff.controller.ts:48-55`
- Test: `test/rbac.spec.ts`

**Interfaces:**
- Consumes: `@RequireOwner()` decorator
- Produces: Strict owner restriction on staff invitations and removal

- [ ] **Step 1: Update decorators on `create` and `delete` in `src/staff/staff.controller.ts`**
Replace `@RequirePermission("manage_staff")` with `@RequireOwner()`.

- [ ] **Step 2: Update test suite to reflect Owner constraint on staff invitation**
In `test/rbac.spec.ts`, assert staff cannot add or remove staff members.

- [ ] **Step 3: Verify tests pass**
Run: `npm test -- test/rbac.spec.ts`

- [ ] **Step 4: Commit**
`git commit -m "fix(staff): restrict staff creation and deletion to organization owner"`

---

### Task 8: Response Normalization and Pagination

**Files:**
- Modify: `src/auth/auth.service.ts:72-82`
- Modify: `src/products/dto/query-products.dto.ts`
- Modify: `src/products/products.service.ts:58-87`

**Interfaces:**
- Consumes: `registerOrg`, `QueryProductsDto`
- Produces: Normalized user profile shape and optional `page`/`limit` pagination

- [ ] **Step 1: Normalize `registerOrg` response in `src/auth/auth.service.ts`**
Return `branchId: null`, `branchName: null`, `roleId: null`, `roleName: "Owner"`, `permissions: ["*"]`.

- [ ] **Step 2: Add pagination to `QueryProductsDto` and `products.service.ts`**
Add optional `page` and `limit` to `QueryProductsDto`. In `findAll`, apply `skip` and `take` when provided.

- [ ] **Step 3: Run full verification suite**
Run: `npm test`
Run: `npm run lint`
Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**
`git commit -m "feat(api): normalize auth response and add product pagination"`
