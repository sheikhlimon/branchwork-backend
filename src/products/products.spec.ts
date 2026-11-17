import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, ConflictException } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaService } from "../prisma/prisma.service";
import { ProductsService } from "./products.service";
import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";

describe("ProductsService Branch Scoping & Inventory Test Suite", () => {
  let prisma: PrismaService;
  let productsService: ProductsService;

  let orgId: string;
  let dhanmondiId: string;
  let gulshanId: string;
  let mustardOilId: string;
  let basmatiRiceId: string;
  let steelFlaskId: string;

  let ownerUser: AuthenticatedUser;
  let gulshanStaffUser: AuthenticatedUser;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
      providers: [ProductsService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    productsService = module.get<ProductsService>(ProductsService);

    // 1. Setup Organization
    const org = await prisma.organization.create({
      data: { name: "Padma Retail Product Test Org" },
    });
    orgId = org.id;

    // 2. Setup Branches
    const dhanmondi = await prisma.branch.create({
      data: { organizationId: orgId, name: "Dhanmondi", city: "Dhaka" },
    });
    dhanmondiId = dhanmondi.id;

    const gulshan = await prisma.branch.create({
      data: { organizationId: orgId, name: "Gulshan", city: "Dhaka" },
    });
    gulshanId = gulshan.id;

    // 3. Setup Users
    ownerUser = {
      id: "owner_user_id",
      email: "nadia@demo.com",
      organizationId: orgId,
      branchId: null,
      roleId: null,
      roleName: null,
      isOwner: true,
    };

    gulshanStaffUser = {
      id: "staff_user_id",
      email: "rafi@demo.com",
      organizationId: orgId,
      branchId: gulshanId, // Hard-locked to Gulshan!
      roleId: "role_stock_clerk",
      roleName: "Stock clerk",
      isOwner: false,
    };
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({
      where: { id: orgId },
    });
  });

  it("Owner should create products matching the prototype specification", async () => {
    // 1. Mustard oil 1L (TEST-OIL-001) in Dhanmondi
    const oil = await productsService.create(orgId, {
      name: "Mustard oil 1L",
      sku: "TEST-OIL-001",
      category: "Grocery",
      price: 112.6,
      stock: 50,
      branchId: dhanmondiId,
    });
    mustardOilId = oil.id;
    expect(oil.name).toBe("Mustard oil 1L");
    expect(oil.sku).toBe("TEST-OIL-001");
    expect(oil.branch.name).toBe("Dhanmondi");

    // 2. Basmati rice 5kg (TEST-RIC-005) in Gulshan
    const rice = await productsService.create(orgId, {
      name: "Basmati rice 5kg",
      sku: "TEST-RIC-005",
      category: "Grocery",
      price: 890.0,
      stock: 40,
      branchId: gulshanId,
    });
    basmatiRiceId = rice.id;
    expect(rice.branch.name).toBe("Gulshan");

    // 3. Steel flask (TEST-HOM-212) in Gulshan
    const flask = await productsService.create(orgId, {
      name: "Steel flask",
      sku: "TEST-HOM-212",
      category: "Home",
      price: 1250.0,
      stock: 20,
      branchId: gulshanId,
    });
    steelFlaskId = flask.id;
    expect(flask.branch.name).toBe("Gulshan");
  });

  it("should preserve exact decimal precision without binary floating point drift", async () => {
    const decimalProduct = await productsService.create(orgId, {
      name: "Gourmet Saffron 10g",
      sku: "TEST-SAF-001",
      category: "Grocery",
      price: 499.55,
      stock: 10,
      branchId: dhanmondiId,
    });

    expect(Number(decimalProduct.price)).toBe(499.55);
    await productsService.delete(orgId, decimalProduct.id);
  });

  it("should reject creating product with duplicate SKU in same organization with ConflictException", async () => {
    await expect(
      productsService.create(orgId, {
        name: "Duplicate Mustard Oil",
        sku: "TEST-OIL-001", // Duplicate SKU in same org
        category: "Grocery",
        price: 115.0,
        stock: 10,
        branchId: dhanmondiId,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("should allow distinct organizations to use the identical SKU", async () => {
    // Setup a second tenant organization
    const org2 = await prisma.organization.create({
      data: { name: "Second Tenant Org" },
    });
    const branch2 = await prisma.branch.create({
      data: { organizationId: org2.id, name: "Banani", city: "Dhaka" },
    });

    try {
      const productOrg2 = await productsService.create(org2.id, {
        name: "Tenant 2 Mustard Oil",
        sku: "TEST-OIL-001", // Same SKU as in org 1!
        category: "Grocery",
        price: 115.0,
        stock: 15,
        branchId: branch2.id,
      });

      expect(productOrg2.id).toBeDefined();
      expect(productOrg2.sku).toBe("TEST-OIL-001");
      expect(productOrg2.organizationId).toBe(org2.id);
    } finally {
      await prisma.organization.deleteMany({
        where: { id: org2.id },
      });
    }
  });

  describe("Branch Scoping Invariants (GET /api/products)", () => {
    it("Owner should see all 3 products across all branches", async () => {
      const allProducts = await productsService.findAll(ownerUser, {});
      expect(allProducts.length).toBe(3);
    });

    it("Owner filtering by branchId should return only that branchs products", async () => {
      const gulshanProducts = await productsService.findAll(ownerUser, {
        branchId: gulshanId,
      });
      expect(gulshanProducts.length).toBe(2);
      expect(gulshanProducts.map((p) => p.sku)).toContain("TEST-RIC-005");
      expect(gulshanProducts.map((p) => p.sku)).toContain("TEST-HOM-212");
      expect(gulshanProducts.map((p) => p.sku)).not.toContain("TEST-OIL-001");
    });

    it("Owner searching by query should filter correctly", async () => {
      const searchResults = await productsService.findAll(ownerUser, {
        search: "rice",
      });
      expect(searchResults.length).toBe(1);
      expect(searchResults[0].name).toBe("Basmati rice 5kg");
    });

    it("Owner searching case-insensitively should match mixed-case name, SKU, or category", async () => {
      // Lowercase "mustard" should match "Mustard oil 1L"
      const nameResults = await productsService.findAll(ownerUser, {
        search: "mustard",
      });
      expect(nameResults.length).toBe(1);
      expect(nameResults[0].sku).toBe("TEST-OIL-001");

      // Lowercase "test-oil" should match uppercase SKU "TEST-OIL-001"
      const skuResults = await productsService.findAll(ownerUser, {
        search: "test-oil",
      });
      expect(skuResults.length).toBe(1);
      expect(skuResults[0].sku).toBe("TEST-OIL-001");
    });

    it("Owner should be able to paginate products using page and limit", async () => {
      // 3 products exist in orgId: Mustard oil, Basmati rice, Steel flask (ordered by createdAt desc)
      const page1 = await productsService.findAll(ownerUser, {
        page: 1,
        limit: 2,
      });
      expect(page1.length).toBe(2);

      const page2 = await productsService.findAll(ownerUser, {
        page: 2,
        limit: 2,
      });
      expect(page2.length).toBe(1);

      // Verify no overlap
      const page1Ids = page1.map((p) => p.id);
      expect(page1Ids).not.toContain(page2[0].id);
    });

    it("CRITICAL: Staff at Gulshan MUST ONLY receive Gulshan products and NEVER Dhanmondi products", async () => {
      // Even if staff does not pass any query param, backend automatically scopes to Gulshan
      const staffProducts = await productsService.findAll(gulshanStaffUser, {});
      expect(staffProducts.length).toBe(2);

      const skus = staffProducts.map((p) => p.sku);
      expect(skus).toContain("TEST-RIC-005"); // Basmati rice 5kg (Gulshan)
      expect(skus).toContain("TEST-HOM-212"); // Steel flask (Gulshan)
      expect(skus).not.toContain("TEST-OIL-001"); // Mustard oil 1L (Dhanmondi) - NEVER LEAKED!
    });

    it("CRITICAL: Staff attempting to tamper query with another branchId is ignored and still scoped to their branch", async () => {
      // Malicious attempt: Staff at Gulshan asks for Dhanmondi products in query param
      const staffProducts = await productsService.findAll(gulshanStaffUser, {
        branchId: dhanmondiId,
      });

      // Backend security invariant: user.branchId overrides client query!
      expect(staffProducts.length).toBe(2);
      expect(staffProducts.map((p) => p.sku)).not.toContain("TEST-OIL-001");
    });

    it("CRITICAL: Staff without assigned branch MUST be rejected with ForbiddenException", async () => {
      const unassignedStaffUser: AuthenticatedUser = {
        id: "unassigned_staff_id",
        email: "unassigned@demo.com",
        organizationId: orgId,
        branchId: null,
        roleId: "some_role_id",
        roleName: "Stock clerk",
        isOwner: false,
      };

      await expect(productsService.findAll(unassignedStaffUser, {})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("Product Organizing (PATCH /api/products/:id/organize)", () => {
    it("Staff should successfully organize stock on products in their assigned branch", async () => {
      const updated = await productsService.organize(gulshanStaffUser, basmatiRiceId, {
        stock: 65,
      });

      expect(updated.stock).toBe(65);
    });

    it("Staff attempting to organize a product from another branch MUST be rejected with ForbiddenException", async () => {
      // Staff at Gulshan attempts to organize Mustard oil located in Dhanmondi
      await expect(
        productsService.organize(gulshanStaffUser, mustardOilId, {
          stock: 999,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("Owner can organize products across any branch", async () => {
      const updated = await productsService.organize(ownerUser, mustardOilId, {
        category: "Premium Grocery",
        stock: 55,
      });

      expect(updated.category).toBe("Premium Grocery");
      expect(updated.stock).toBe(55);
    });
  });

  describe("Product Deletion (Owner Only)", () => {
    it("Owner should delete product successfully", async () => {
      await productsService.delete(orgId, steelFlaskId);

      const allProducts = await productsService.findAll(ownerUser, {});
      expect(allProducts.length).toBe(2);
      expect(allProducts.map((p) => p.id)).not.toContain(steelFlaskId);
    });
  });
});
