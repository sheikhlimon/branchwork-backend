# Branchwork

Multi-tenant retail management API with branch-scoped access control, built with NestJS, TypeScript, PostgreSQL, and Prisma.

## Core Security & Scoping Rules

Branchwork is built around four non-negotiable rules:

* **Tenant Isolation:** Every database query enforces the `organizationId` from the cryptographically verified JWT. One retail brand can never see or touch another brand's data.
* **Branch-Level Scoping:** Store staff are strictly restricted to their assigned branch. For example, when Rafi logs in at the Gulshan branch, product queries automatically filter to Gulshan only.
* **Role-Based Access Control:** Only organization owners can create branches, define roles, and add or delete product SKUs. Staff with the `organize_products` permission can only update stock, category, or branch assignment within their own branch.
* **Safe Branch Deletion:** A branch cannot be deleted if active staff or products are still assigned to it (returns `409 Conflict`), preventing accidental data loss.

For detailed architecture diagrams, ERDs, and design records, see [`docs/architecture.md`](docs/architecture.md).

## Tech Stack

* **Framework:** [NestJS](https://nestjs.com/) (Node.js 24, TypeScript 5.7)
* **Database & ORM:** PostgreSQL 16 with [Prisma ORM](https://www.prisma.io/)
* **Authentication:** JWT with refresh token rotation and `bcrypt` password hashing
* **Documentation:** Interactive OpenAPI / Swagger UI at `/api/docs`

## Quickstart

### Option A: Docker (Fastest / Zero Setup)

Run the entire application stack (PostgreSQL + SQL migrations + seeded demo accounts + NestJS API) with one command:

```bash
docker compose up --build
```

Once started:
* **Interactive Swagger UI:** `http://localhost:3000/api/docs`
* **API Base:** `http://localhost:3000/api`

### Option B: Local Development

For running tests and developing locally with hot reload:

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start PostgreSQL container:
```bash
docker compose up -d postgres
```

4. Apply database migrations and seed demo data:
```bash
npx prisma migrate deploy
npm run seed
```

5. Start the development server:
```bash
npm run start:dev
```

## Demo Accounts

The seed script creates a demo retail organization (**Padma Retail**) with two branches (**Gulshan** and **Dhanmondi**) and two demo users:

| Role | Name | Email | Password | Assigned Branch | Access Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Owner** | Nadia Rahman | `nadia@demo.com` | `demo123` | *All Branches* | Full administrative access |
| **Stock Clerk** | Rafi Ahmed | `rafi@demo.com` | `demo123` | **Gulshan** | `view_products`, `organize_products` (Gulshan only) |

## API Endpoints

All endpoints except authentication require a valid Bearer token in the `Authorization` header.

### Authentication
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new organization and owner account |
| `POST` | `/api/auth/login` | Public | Authenticate user, returns access token + refresh token |
| `POST` | `/api/auth/refresh` | Public | Rotate refresh token and get a new access token |
| `POST` | `/api/auth/logout` | Authenticated | Revoke refresh token and invalidate session |

### Branches
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/branches` | Owner / Staff | List all branches in the organization |
| `POST` | `/api/branches` | Owner Only | Create a new store branch |
| `DELETE` | `/api/branches/:id` | Owner Only | Delete branch (blocked if branch has staff or inventory) |

### Products
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/products` | Owner / Staff | List products (automatically scoped to branch for staff) |
| `POST` | `/api/products` | Owner Only | Create a new product SKU |
| `PATCH` | `/api/products/:id` | Owner / Staff | Update product (staff can only organize within own branch) |
| `DELETE` | `/api/products/:id` | Owner Only | Permanently delete a product |

### Staff & Roles
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/roles` | Owner / Staff | List available roles and permissions |
| `POST` | `/api/roles` | Owner Only | Create custom RBAC role with selected permissions |
| `GET` | `/api/staff` | Owner / `manage_staff` | List staff members and branch assignments |
| `POST` | `/api/staff` | Owner / `manage_staff` | Invite staff member (enforces IAM delegation ceiling) |
| `DELETE` | `/api/staff/:id` | Owner Only | Remove staff member from organization |

## Scoping & Permissions Behavior

| User | Action | Result | Why |
| :--- | :--- | :--- | :--- |
| **Nadia (Owner)** | `GET /api/products` | Returns all products across Gulshan & Dhanmondi | Owners have organization-wide visibility |
| **Rafi (Clerk)** | `GET /api/products` | Returns only Gulshan products | Branch scoping injects `branchId: Gulshan` filter |
| **Rafi (Clerk)** | `PATCH /api/products/:gulshanId` | `200 OK` (updates category/stock) | Rafi has `organize_products` for his branch |
| **Rafi (Clerk)** | `PATCH /api/products/:dhanmondiId`| `404 Not Found` | Cannot access or mutate another branch's inventory |
| **Rafi (Clerk)** | `POST /api/products` | `403 Forbidden` | Only organization owners can create new SKUs |
| **Rafi (Clerk)** | `DELETE /api/products/:id` | `403 Forbidden` | Only organization owners can delete SKUs |
| **Nadia (Owner)** | `DELETE /api/branches/:gulshanId` | `409 Conflict` | Blocked because Gulshan has active staff and products |

## Automated Verification

All business rules, scoping constraints, and error scenarios are verified with automated tests running against PostgreSQL:

```bash
# Run all unit and integration tests
npm test

# Type-check TypeScript without emitting JS
npm run typecheck

# Run linter
npm run lint
```

## License

This project is licensed under the [MIT License](LICENSE).
