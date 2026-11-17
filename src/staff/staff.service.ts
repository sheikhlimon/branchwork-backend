import { Injectable, NotFoundException, ConflictException, ForbiddenException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStaffDto } from "./dto/create-staff.dto";
import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.user.findMany({
      where: {
        organizationId,
        isOwner: false, // Only list staff accounts
      },
      select: {
        id: true,
        name: true,
        email: true,
        isOwner: true,
        branchId: true,
        roleId: true,
        createdAt: true,
        branch: {
          select: { id: true, name: true, city: true },
        },
        role: {
          select: { id: true, name: true, permissions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Creates a new staff account bound to a branch and role.
   * Enforces IAM delegation ceilings: non-owners cannot assign permissions they do not possess.
   */
  async create(organizationId: string, dto: CreateStaffDto, actor?: AuthenticatedUser) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException("Email is already registered");
    }

    // Verify branch belongs to organization
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, organizationId },
    });
    if (!branch) {
      throw new NotFoundException("Branch not found in this organization");
    }

    // Verify role belongs to organization
    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, organizationId },
    });
    if (!role) {
      throw new NotFoundException("Role not found in this organization");
    }

    // Privilege Escalation Defense:
    // If the actor is not the owner, verify they hold all permissions assigned to the target role.
    if (actor && !actor.isOwner) {
      const targetPermissions: string[] = JSON.parse(role.permissions || "[]");
      let actorPermissions = actor.permissions;
      if (!actorPermissions && actor.roleId) {
        const actorRole = await this.prisma.role.findUnique({
          where: { id: actor.roleId },
        });
        actorPermissions = actorRole ? JSON.parse(actorRole.permissions || "[]") : [];
      }
      actorPermissions = actorPermissions || [];

      const hasDelegationClearance = targetPermissions.every((perm) =>
        actorPermissions!.includes(perm),
      );

      if (!hasDelegationClearance) {
        throw new ForbiddenException(
          "You cannot assign a role with permissions exceeding your own",
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        organizationId,
        branchId: branch.id,
        roleId: role.id,
        name: dto.name.trim(),
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        isOwner: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isOwner: true,
        branchId: true,
        roleId: true,
        branch: {
          select: { id: true, name: true, city: true },
        },
        role: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async delete(organizationId: string, staffId: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id: staffId, organizationId, isOwner: false },
    });

    if (!staff) {
      throw new NotFoundException("Staff member not found");
    }

    return this.prisma.user.delete({
      where: { id: staff.id },
    });
  }
}
