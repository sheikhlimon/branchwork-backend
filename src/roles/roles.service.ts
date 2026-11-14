import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRoleDto } from "./dto/create-role.dto";

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const roles = await this.prisma.role.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return roles.map((role) => ({
      ...role,
      permissions: JSON.parse(role.permissions || "[]") as string[],
      staffCount: role._count.users,
    }));
  }

  async create(organizationId: string, dto: CreateRoleDto) {
    const role = await this.prisma.role.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        permissions: JSON.stringify(dto.permissions),
      },
    });

    return {
      ...role,
      permissions: JSON.parse(role.permissions || "[]") as string[],
    };
  }

  async delete(organizationId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, organizationId },
    });

    if (!role) {
      throw new NotFoundException("Role not found");
    }

    return this.prisma.role.delete({
      where: { id: role.id },
    });
  }
}
