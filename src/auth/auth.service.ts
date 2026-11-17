import { Injectable, ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterOrgDto } from "./dto/register-org.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  branchId?: string | null;
  roleId?: string | null;
  roleName?: string | null;
  isOwner: boolean;
  permissions?: string[];
}

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Hashes a raw refresh token using SHA-256 before database storage/comparison.
   */
  private hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
  }

  /**
   * Generates a cryptographically secure random token, stores its SHA-256 hash in DB,
   * and returns the raw token string to be delivered to the client.
   */
  private async createAndStoreRefreshToken(userId: string): Promise<string> {
    const rawToken = crypto.randomBytes(40).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return rawToken;
  }

  /**
   * Formats a user entity into the public session profile contract.
   */
  private formatUserProfile(user: {
    id: string;
    name: string;
    email: string;
    isOwner: boolean;
    organizationId: string;
    branchId: string | null;
    roleId: string | null;
    organization: { name: string };
    branch?: { name: string } | null;
    role?: { name: string; permissions: string } | null;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      isOwner: user.isOwner,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
      branchId: user.branchId,
      branchName: user.branch?.name || null,
      roleId: user.roleId,
      roleName: user.role?.name || (user.isOwner ? "Owner" : null),
      permissions: user.role
        ? JSON.parse(user.role.permissions || "[]")
        : user.isOwner
          ? ["*"]
          : [],
    };
  }

  /**
   * Registers a new Organization and its primary Owner user atomically.
   */
  async registerOrg(dto: RegisterOrgDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException("Email is already registered");
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    // Atomic transaction: create Organization + Owner User
    const { org, user } = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName.trim(),
        },
      });

      const user = await tx.user.create({
        data: {
          name: dto.ownerName.trim(),
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          isOwner: true,
          organizationId: org.id,
        },
      });

      return { org, user };
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      branchId: user.branchId,
      roleId: user.roleId,
      isOwner: user.isOwner,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createAndStoreRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: this.formatUserProfile({
        ...user,
        organization: org,
        branch: null,
        role: null,
      }),
    };
  }

  /**
   * Authenticates a user (Owner or Staff) and issues a scoped JWT access token and refresh token.
   */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: {
        organization: true,
        branch: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      branchId: user.branchId,
      roleId: user.roleId,
      roleName: user.role?.name || null,
      isOwner: user.isOwner,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = await this.createAndStoreRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: this.formatUserProfile(user),
    };
  }

  /**
   * Validates a refresh token, performs token rotation, and returns a fresh access & refresh token pair.
   * If a revoked token is presented, detects token reuse and invalidates all user refresh sessions.
   */
  async refresh(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            organization: true,
            branch: true,
            role: true,
          },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Token reuse detection: if token was already revoked, someone may have intercepted it!
    // Invalidate all active refresh tokens for this user as a safeguard.
    if (storedToken.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: storedToken.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Revoked refresh token presented. All active sessions have been invalidated.");
    }

    // Check expiration
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token has expired");
    }

    // Atomically rotate: revoke the used refresh token and issue a new one
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const user = storedToken.user;
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      branchId: user.branchId,
      roleId: user.roleId,
      roleName: user.role?.name || null,
      isOwner: user.isOwner,
    };

    const accessToken = this.jwtService.sign(payload);
    const newRefreshToken = await this.createAndStoreRefreshToken(user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.formatUserProfile(user),
    };
  }

  /**
   * Revokes the provided refresh token to securely terminate the session.
   */
  async logout(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (storedToken && !storedToken.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
    }

    return { message: "Logged out successfully" };
  }

  /**
   * Resolves the full current profile for the authenticated session.
   */
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        branch: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return this.formatUserProfile(user);
  }
}
