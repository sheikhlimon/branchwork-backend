# Branchwork Backend

> Multi-tenant retail organization console backend with branch-scoped Role-Based Access Control (RBAC), built with **NestJS**, **TypeScript**, and **Prisma ORM**.

## Architecture Overview

Branchwork powers a multi-branch retail organization console:
- **Tenant Isolation:** Every data query enforces `organizationId` from the cryptographically verified JWT session. Organizations can never see each other's data.
- **Branch-Level Scoping:** When a staff member logs in (e.g., Rafi Ahmed at Gulshan), `GET /api/products` automatically injects `WHERE branchId = user.branchId`. Staff can never see or organize inventory from other branches.
- **RBAC Governance:** Only the Organization Owner can create branches, define roles, and create/delete product SKUs. Staff with the `organize_products` permission can only adjust stock, category, and branch assignment for products in their branch.

Full C2 architecture diagrams, ERD, and key architectural decisions (ADRs) are documented in [`docs/architecture.md`](docs/architecture.md).  
Implementation roadmap and feature branches are tracked in [`docs/plan.md`](docs/plan.md).  
Developer guidelines and invariants are defined in [`AGENTS.md`](AGENTS.md).

## Tech Stack & Tooling

- **Runtime:** Node.js 24+
- **Framework:** [NestJS](https://nestjs.com/) (Modular architecture, Guards, Dependency Injection)
- **Language:** TypeScript 5.7+
- **ORM & Database:** [Prisma](https://www.prisma.io/) with PostgreSQL 16 (via Docker / Podman or local service)
- **Sub-Second Tooling:** [oxlint](https://oxc.rs/) (fast Rust linter) + [oxfmt](https://oxc.rs/) (double quotes formatting)
- **Authentication:** Stateless JWT + `bcrypt` password hashing
- **Documentation:** Interactive OpenAPI / Swagger UI at `/api/docs`

## 2-Minute Quickstart

### Prerequisites
- Node.js 24+ (`npm`)
- Docker or Podman (for running PostgreSQL or the full container stack)

### Option A: Local Run (Fastest)

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env

# 3. Start PostgreSQL container
docker compose up -d postgres   # or: podman compose up -d postgres

# 4. Push database schema & seed demo accounts
npx prisma db push
npm run seed

# 5. Run tests
npm test

# 6. Start development server
npm run start:dev
```

Once running:
- **API Base:** `http://localhost:3000/api`
- **Interactive Swagger UI:** `http://localhost:3000/api/docs`

### Option B: Containerized Run (Docker or Podman)

```bash
# Docker Compose:
docker compose up --build   # or: npm run docker:up

# Podman Compose:
podman compose up --build
```
Spins up PostgreSQL 16 and the NestJS API with database migrations and healthchecks automatically configured.

## Demo Credentials (From Prototype Specification)

| Role | Email | Password | Assigned Branch | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Owner (Nadia Rahman)** | `nadia@demo.com` | `demo123` | *All Branches* | Superadmin (`*` wildcard) |
| **Stock Clerk (Rafi Ahmed)** | `rafi@demo.com` | `demo123` | **Gulshan** | `view_products`, `organize_products` (Gulshan only) |

## Testing Scoping via cURL

### 1. Log in as Owner (Nadia)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "nadia@demo.com", "password": "demo123"}'
```
*Returns JWT access token for Nadia.*

### 2. Log in as Staff (Rafi at Gulshan)
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "rafi@demo.com", "password": "demo123"}'
```
*Returns JWT access token for Rafi.*

### 3. Query Products as Staff (Branch Scoping in Action)
```bash
curl -X GET http://localhost:3000/api/products \
  -H "Authorization: Bearer <RAFI_TOKEN>"
```
*Response contains **only Gulshan products** (Basmati rice 5kg, Steel flask). Mustard oil 1L (Dhanmondi) is never returned.*

### 4. Staff Attempts to Delete a Product (RBAC Enforcement)
```bash
curl -X DELETE http://localhost:3000/api/products/<PRODUCT_ID> \
  -H "Authorization: Bearer <RAFI_TOKEN>"
```
*Returns **`403 Forbidden`** (Only owner can delete products).*

## Automated Testing & Verifiability

Branchwork features comprehensive integration test suites covering authentication, RBAC permissions, branch catalog leakage, branch deletion safeguards (`onDelete: Restrict`), and unique constraint validation.

Tests execute against a live PostgreSQL 16 engine rather than mock adapters to guarantee true zero-mock verification of multi-tenant database invariants. The test runner is fully automated:

```bash
npm test
```
*The pre-test guard automatically verifies database connectivity, auto-starts the PostgreSQL container via Docker if stopped, and synchronizes the Prisma schema before Jest begins.*

## License

This project is licensed under the [MIT License](LICENSE).
