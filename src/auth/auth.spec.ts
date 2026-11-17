import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaService } from "../prisma/prisma.service";

describe("AuthService TDD Suite", () => {
  let authService: AuthService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          secret: "test_jwt_secret_key",
          signOptions: { expiresIn: "1d" },
        }),
        PrismaModule,
      ],
      providers: [AuthService],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up test organizations created during auth tests
    await prisma.organization.deleteMany({
      where: {
        name: { in: ["Padma Retail Test", "Duplicate Test Org"] },
      },
    });
  });

  it("should be defined", () => {
    expect(authService).toBeDefined();
  });

  describe("Organization & Owner Registration", () => {
    it("should register an organization with an owner and return a JWT", async () => {
      const result = await authService.registerOrg({
        organizationName: "Padma Retail Test",
        ownerName: "Nadia Rahman",
        email: "nadia.test@demo.com",
        password: "demo123password",
      });

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(typeof result.accessToken).toBe("string");
      expect(result.refreshToken).toBeDefined();
      expect(typeof result.refreshToken).toBe("string");
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe("nadia.test@demo.com");
      expect(result.user.name).toBe("Nadia Rahman");
      expect(result.user.isOwner).toBe(true);
      expect(result.user.organizationId).toBeDefined();
      expect(result.user.permissions).toEqual(["*"]);
      expect(result.user.roleName).toBe("Owner");
      expect(result.user.branchId).toBeNull();
    });

    it("should reject registration if email is already taken with ConflictException", async () => {
      await expect(
        authService.registerOrg({
          organizationName: "Duplicate Test Org",
          ownerName: "Duplicate Nadia",
          email: "nadia.test@demo.com", // Duplicate email
          password: "demo123password",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("User Login & Authentication", () => {
    it("should successfully authenticate with valid credentials", async () => {
      const result = await authService.login({
        email: "nadia.test@demo.com",
        password: "demo123password",
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe("nadia.test@demo.com");
      expect(result.user.isOwner).toBe(true);
    });

    it("should reject login with invalid password throwing UnauthorizedException", async () => {
      await expect(
        authService.login({
          email: "nadia.test@demo.com",
          password: "WRONG_PASSWORD",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should reject login with non-existent email throwing UnauthorizedException", async () => {
      await expect(
        authService.login({
          email: "ghost_user@nonexistent.com",
          password: "demo123password",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("Session Profile Resolution (getMe)", () => {
    it("should return the full session profile with wildcard permissions for owner", async () => {
      const loginRes = await authService.login({
        email: "nadia.test@demo.com",
        password: "demo123password",
      });

      const profile = await authService.getMe(loginRes.user.id);
      expect(profile).toBeDefined();
      expect(profile.email).toBe("nadia.test@demo.com");
      expect(profile.isOwner).toBe(true);
      expect(profile.permissions).toContain("*");
    });

    it("should throw UnauthorizedException if user ID does not exist", async () => {
      await expect(authService.getMe("non-existent-user-id")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("JwtStrategy Security Invariants", () => {
    it("should fail fast when JWT_SECRET is missing from configuration", () => {
      const mockConfigService = {
        getOrThrow: jest.fn().mockImplementation((key: string) => {
          if (key === "JWT_SECRET") {
            throw new Error('Configuration key "JWT_SECRET" does not exist');
          }
          return undefined;
        }),
      } as unknown as ConfigService;

      expect(() => new JwtStrategy(mockConfigService)).toThrow(
        'Configuration key "JWT_SECRET" does not exist',
      );
    });

    it("should respect JWT_EXPIRES_IN environment setting", () => {
      const mockConfigService = {
        getOrThrow: jest.fn().mockReturnValue("test_secret"),
        get: jest.fn().mockImplementation((key: string) => {
          if (key === "JWT_EXPIRES_IN") return "7d";
          return undefined;
        }),
      } as unknown as ConfigService;

      const expiresIn = mockConfigService.get<string>("JWT_EXPIRES_IN") || "1d";
      expect(expiresIn).toBe("7d");
    });
  });

  describe("Refresh Token Rotation & Session Revocation", () => {
    let activeRefreshToken: string;

    it("should successfully rotate tokens with a valid refresh token", async () => {
      const loginRes = await authService.login({
        email: "nadia.test@demo.com",
        password: "demo123password",
      });

      activeRefreshToken = loginRes.refreshToken;

      const refreshRes = await authService.refresh({
        refreshToken: activeRefreshToken,
      });

      expect(refreshRes.accessToken).toBeDefined();
      expect(refreshRes.refreshToken).toBeDefined();
      // Verifies token rotation: the new token must not match the old token
      expect(refreshRes.refreshToken).not.toBe(activeRefreshToken);
      expect(refreshRes.user.email).toBe("nadia.test@demo.com");

      // Update to point to the newly issued refresh token
      activeRefreshToken = refreshRes.refreshToken;
    });

    it("should detect token reuse and reject an already-revoked refresh token", async () => {
      // Re-submitting the old rotated token must trigger reuse detection
      await expect(
        authService.refresh({
          refreshToken: activeRefreshToken, // Refresh it once
        }),
      ).resolves.toBeDefined();

      // Now attempting to re-use the exact same token again must fail
      await expect(
        authService.refresh({
          refreshToken: activeRefreshToken,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should reject an invalid or malformed refresh token", async () => {
      await expect(
        authService.refresh({
          refreshToken: "fake_non_existent_token_12345",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should successfully revoke a refresh token on logout", async () => {
      const loginRes = await authService.login({
        email: "nadia.test@demo.com",
        password: "demo123password",
      });

      const logoutRes = await authService.logout({
        refreshToken: loginRes.refreshToken,
      });

      expect(logoutRes.message).toBe("Logged out successfully");

      // Attempting to refresh with the logged-out token must fail
      await expect(
        authService.refresh({
          refreshToken: loginRes.refreshToken,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should handle concurrent refresh attempts safely with reuse protection", async () => {
      const loginRes = await authService.login({
        email: "nadia.test@demo.com",
        password: "demo123password",
      });

      // Fire two concurrent refresh requests simultaneously with the same token
      const [res1, res2] = await Promise.allSettled([
        authService.refresh({ refreshToken: loginRes.refreshToken }),
        authService.refresh({ refreshToken: loginRes.refreshToken }),
      ]);

      // Exactly one should succeed; the other must be rejected with UnauthorizedException
      const successes = [res1, res2].filter((r) => r.status === "fulfilled");
      const failures = [res1, res2].filter((r) => r.status === "rejected");

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
    });
  });
});
