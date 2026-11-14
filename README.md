# Branchwork Backend

> Multi-tenant retail console backend with branch-scoped Role-Based Access Control (RBAC), built with **NestJS**, **TypeScript**, and **Prisma ORM**.

---

## Overview

Branchwork powers a multi-branch organization console where:
- Organizations register with an Owner account.
- Owners configure branches (e.g., Dhanmondi, Gulshan), define custom roles with granular permission checklists, and assign staff to specific branches.
- Staff log in and are strictly scoped to their assigned branch and allowed permissions.
- Owners maintain full authority to create and delete products across all branches, while Staff with permission can organize stock and categories for their own branch.

Detailed architecture specifications, C2 diagrams, and ERD are documented in [`docs/architecture.md`](docs/architecture.md).  
Implementation roadmap and feature branches are tracked in [`docs/plan.md`](docs/plan.md).  
Developer guidelines and invariants are enforced in [`AGENTS.md`](AGENTS.md).

---

## Tech Stack

- **Framework:** [NestJS](https://nestjs.com/) (Modular architecture, Dependency Injection, Guards)
- **Language:** TypeScript (Strict typing, ES2023)
- **ORM & Database:** [Prisma](https://www.prisma.io/) with SQLite (zero-config dev) / PostgreSQL (production)
- **Authentication:** JWT (Stateless Bearer Tokens) + `bcrypt`
- **Validation:** `class-validator` & `class-transformer`
- **API Documentation:** OpenAPI / Swagger UI at `/api`

---

## Quickstart

### Prerequisites
- Node.js 22+ or 26+
- npm 10+

### Setup & Run
```bash
# 1. Install dependencies
npm install

# 2. Sync database schema
npx prisma db push

# 3. Seed demo accounts (Padma Retail, Nadia Rahman, Rafi Ahmed)
npm run seed

# 4. Start development server
npm run start:dev
```

Once running:
- **API Base:** `http://localhost:3000/api`
- **Interactive Swagger Docs:** `http://localhost:3000/api/docs`
- **Prisma Studio (GUI):** `npx prisma studio`

---

## Demo Accounts (From Specification)

| Role | Email | Password | Assigned Branch | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Owner** | `nadia@demo.com` | `demo123` | *All Branches* | Full Superadmin Access |
| **Stock Clerk** | `rafi@demo.com` | `demo123` | **Gulshan** | `view_products`, `organize_products` (Gulshan only) |
