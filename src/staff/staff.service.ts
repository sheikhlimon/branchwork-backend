import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateStaffDto } from "./dto/create-staff.dto";

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

  async create(organizationId: string, dto: CreateStaffDto) {
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
