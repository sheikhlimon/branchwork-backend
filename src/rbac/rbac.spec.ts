import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException, ConflictException, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "../auth/auth.service";
import { BranchesService } from "../branches/branches.service";
import { RolesService } from "../roles/roles.service";
import { StaffService } from "../staff/staff.service";
import { StaffController } from "../staff/staff.controller";
import { RolesGuard } from "../common/guards/roles.guard";
import { REQUIRE_OWNER_KEY } from "../common/decorators/require-owner.decorator";
import { REQUIRE_PERMISSION_KEY } from "../common/decorators/require-permission.decorator";
import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";

describe("RBAC & Branch Scoping Test Suite", () => {
  let prisma: PrismaService;
  let authService: AuthService;
  let branchesService: BranchesService;
  let rolesService: RolesService;
  let staffService: StaffService;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  let orgId: string;
  let ownerUser: AuthenticatedUser;
  let staffUser: AuthenticatedUser;
  let branchManagerUser: AuthenticatedUser;
  let dhanmondiBranchId: string;
  let gulshanBranchId: string;
  let stockClerkRoleId: string;
  let branchManagerRoleId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({ secret: "rbac_test_secret" }),
        PrismaModule,
      ],
      providers: [AuthService, BranchesService, RolesService, StaffService, RolesGuard, Reflector],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    authService = module.get<AuthService>(AuthService);
    branchesService = module.get<BranchesService>(BranchesService);
    rolesService = module.get<RolesService>(RolesService);
    staffService = module.get<StaffService>(StaffService);
    rolesGuard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);

    // 1. Setup Organization & Owner Nadia
    const regRes = await authService.registerOrg({
      organizationName: "Padma Retail RBAC Test",
      ownerName: "Nadia Rahman",
      email: "nadia.rbac@demo.com",
      password: "demo123password",
    });

    orgId = regRes.user.organizationId;
    ownerUser = {
      id: regRes.user.id,
      email: regRes.user.email,
      organizationId: orgId,
      branchId: null,
      roleId: null,
      roleName: null,
      isOwner: true,
    };
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({
      where: { id: orgId },
    });
  });

  it("Owner should successfully create Dhanmondi and Gulshan branches", async () => {
    const dhanmondi = await branchesService.create(orgId, {
      name: "Dhanmondi",
      city: "Dhaka",
    });
    const gulshan = await branchesService.create(orgId, {
      name: "Gulshan",
      city: "Dhaka",
    });

    dhanmondiBranchId = dhanmondi.id;
    gulshanBranchId = gulshan.id;

    expect(dhanmondi.name).toBe("Dhanmondi");
    expect(gulshan.name).toBe("Gulshan");

    const allBranches = await branchesService.findAll(orgId);
    expect(allBranches.length).toBe(2);
  });

  it("Owner should successfully create roles with permission checklists", async () => {
    // Branch manager: manage_staff, view_products, organize_products
    const bmRole = await rolesService.create(orgId, {
      name: "Branch manager",
      permissions: ["manage_staff", "view_products", "organize_products"],
    });
    branchManagerRoleId = bmRole.id;

    // Stock clerk: view_products, organize_products
    const scRole = await rolesService.create(orgId, {
      name: "Stock clerk",
      permissions: ["view_products", "organize_products"],
    });
    stockClerkRoleId = scRole.id;

    expect(bmRole.permissions).toContain("manage_staff");
    expect(scRole.permissions).not.toContain("manage_staff");
    expect(scRole.permissions).toContain("organize_products");
  });

  it("Owner should add staff Rafi Ahmed assigned to Gulshan as Stock Clerk", async () => {
    const staff = await staffService.create(orgId, {
      name: "Rafi Ahmed",
      email: "rafi.rbac@demo.com",
      password: "demo123password",
      branchId: gulshanBranchId,
      roleId: stockClerkRoleId,
    });

    staffUser = {
      id: staff.id,
      email: staff.email,
      organizationId: orgId,
      branchId: gulshanBranchId,
      roleId: stockClerkRoleId,
      roleName: "Stock clerk",
      isOwner: false,
    };

    expect(staff.name).toBe("Rafi Ahmed");
    expect(staff.branchId).toBe(gulshanBranchId);
    expect(staff.roleId).toBe(stockClerkRoleId);
    expect(staff.isOwner).toBe(false);
  });

  it("Owner should add Branch Manager staff member", async () => {
    const bmStaff = await staffService.create(orgId, {
      name: "Manager Karim",
      email: "karim.rbac@demo.com",
      password: "demo123password",
      branchId: dhanmondiBranchId,
      roleId: branchManagerRoleId,
    });

    branchManagerUser = {
      id: bmStaff.id,
      email: bmStaff.email,
      organizationId: orgId,
      branchId: dhanmondiBranchId,
      roleId: branchManagerRoleId,
      roleName: "Branch manager",
      isOwner: false,
    };

    expect(bmStaff.name).toBe("Manager Karim");
  });

  describe("RolesGuard Security Checks", () => {
    const createMockContext = (
      user: AuthenticatedUser,
      handlerMeta: Record<string, unknown>,
    ): ExecutionContext => {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
        getHandler: () => handlerMeta,
        getClass: () => ({}),
      } as unknown as ExecutionContext;
    };

    it("should allow Owner access to any route", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === REQUIRE_OWNER_KEY) return true;
        if (key === REQUIRE_PERMISSION_KEY) return "manage_staff";
        return undefined;
      });

      const context = createMockContext(ownerUser, {});
      const allowed = await rolesGuard.canActivate(context);
      expect(allowed).toBe(true);
    });

    it("should block non-owner staff from accessing @RequireOwner() routes", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === REQUIRE_OWNER_KEY) return true;
        return undefined;
      });

      const context = createMockContext(staffUser, {});
      await expect(rolesGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it("should block staff without manage_staff permission from calling staff management", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === REQUIRE_OWNER_KEY) return undefined;
        if (key === REQUIRE_PERMISSION_KEY) return "manage_staff";
        return undefined;
      });

      // Rafi Ahmed is a Stock Clerk (has view_products, organize_products, but NOT manage_staff)
      const context = createMockContext(staffUser, {});
      await expect(rolesGuard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it("should allow Branch Manager with manage_staff permission to proceed", async () => {
      jest.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
        if (key === REQUIRE_OWNER_KEY) return undefined;
        if (key === REQUIRE_PERMISSION_KEY) return "manage_staff";
        return undefined;
      });

      const context = createMockContext(branchManagerUser, {});
      const allowed = await rolesGuard.canActivate(context);
      expect(allowed).toBe(true);
    });

    it("StaffController create requires manage_staff and delete is protected with @RequireOwner()", () => {
      const createPermission = reflector.get<string>(
        REQUIRE_PERMISSION_KEY,
        StaffController.prototype.create,
      );
      const isDeleteOwnerOnly = reflector.get<boolean>(
        REQUIRE_OWNER_KEY,
        StaffController.prototype.delete,
      );

      expect(createPermission).toBe("manage_staff");
      expect(isDeleteOwnerOnly).toBe(true);
    });

    it("should prevent non-owner managers from assigning roles with permissions exceeding their own", async () => {
      // Manager Karim only has permissions: ["manage_staff", "view_products"] (lacks "organize_products")
      const limitedManager: AuthenticatedUser = {
        ...branchManagerUser,
        permissions: ["manage_staff", "view_products"],
      };

      // Target role has "organize_products", which Karim does not possess
      await expect(
        staffService.create(
          orgId,
          {
            name: "Subordinate Staff",
            email: "subordinate@demo.com",
            password: "demo123password",
            branchId: dhanmondiBranchId,
            roleId: stockClerkRoleId, // has ["view_products", "organize_products"]
          },
          limitedManager,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("Branch Deletion Invariants", () => {
    it("should reject deleting a branch that contains active staff members with ConflictException", async () => {
      // Gulshan branch currently contains staff member Rafi Ahmed
      await expect(branchesService.delete(orgId, gulshanBranchId)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should reject deleting a branch that contains active products with ConflictException", async () => {
      // Create a test product inside Dhanmondi branch
      await prisma.product.create({
        data: {
          organizationId: orgId,
          branchId: dhanmondiBranchId,
          name: "Test Branch Product",
          sku: "TEST-BRANCH-DEL-01",
          category: "General",
          price: 50.0,
          stock: 5,
        },
      });

      // Attempting to delete Dhanmondi should throw ConflictException instead of crashing
      await expect(branchesService.delete(orgId, dhanmondiBranchId)).rejects.toThrow(
        ConflictException,
      );
    });

    it("should delete branch successfully when it has no active products", async () => {
      const emptyBranch = await branchesService.create(orgId, {
        name: "Temporary Branch",
        city: "Chittagong",
      });

      const deleted = await branchesService.delete(orgId, emptyBranch.id);
      expect(deleted.id).toBe(emptyBranch.id);
    });
  });
});
