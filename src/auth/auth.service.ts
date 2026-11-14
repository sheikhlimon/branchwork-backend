import { Injectable, ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterOrgDto } from "./dto/register-org.dto";
import { LoginDto } from "./dto/login.dto";

export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  branchId?: string | null;
  roleId?: string | null;
  roleName?: string | null;
  isOwner: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

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

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isOwner: user.isOwner,
        organizationId: user.organizationId,
        organizationName: org.name,
        branchId: null,
        branchName: null,
        roleId: null,
        roleName: "Owner",
        permissions: ["*"],
      },
    };
  }

  /**
   * Authenticates a user (Owner or Staff) and issues a scoped JWT.
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

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isOwner: user.isOwner,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
        branchId: user.branchId,
        branchName: user.branch?.name || null,
        roleId: user.roleId,
        roleName: user.role?.name || null,
        permissions: user.role
          ? JSON.parse(user.role.permissions || "[]")
          : user.isOwner
            ? ["*"]
            : [],
      },
    };
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
      roleName: user.role?.name || null,
      permissions: user.role
        ? JSON.parse(user.role.permissions || "[]")
        : user.isOwner
          ? ["*"]
          : [],
    };
  }
}
