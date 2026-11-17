import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBranchDto } from "./dto/create-branch.dto";

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.branch.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: {
            users: true,
            products: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(organizationId: string, dto: CreateBranchDto) {
    return this.prisma.branch.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        city: dto.city.trim(),
      },
    });
  }

  async delete(organizationId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId },
      include: {
        _count: {
          select: {
            users: true,
            products: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException("Branch not found");
    }

    if (branch._count.users > 0 || branch._count.products > 0) {
      throw new ConflictException(
        `Cannot delete branch '${branch.name}'. It contains ${branch._count.users} staff member(s) and ${branch._count.products} active product(s). Reassign them first.`,
      );
    }

    return this.prisma.branch.delete({
      where: { id: branch.id },
    });
  }
}
