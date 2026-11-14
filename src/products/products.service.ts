import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { OrganizeProductDto } from "./dto/organize-product.dto";
import { QueryProductsDto } from "./dto/query-products.dto";
import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new product SKU in a specific branch (Owner only).
   */
  async create(organizationId: string, dto: CreateProductDto) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: dto.branchId, organizationId },
    });

    if (!branch) {
      throw new NotFoundException("Branch not found in this organization");
    }

    const existingSku = await this.prisma.product.findUnique({
      where: {
        organizationId_sku: {
          organizationId,
          sku: dto.sku.trim().toUpperCase(),
        },
      },
    });

    if (existingSku) {
      throw new ConflictException(`Product with SKU '${dto.sku}' already exists`);
    }

    return this.prisma.product.create({
      data: {
        organizationId,
        branchId: branch.id,
        name: dto.name.trim(),
        sku: dto.sku.trim().toUpperCase(),
        category: dto.category.trim(),
        price: dto.price,
        stock: dto.stock,
      },
      include: {
        branch: {
          select: { id: true, name: true, city: true },
        },
      },
    });
  }

  /**
   * Lists products with automatic branch-scoping and multi-tenancy.
   */
  async findAll(user: AuthenticatedUser, query: QueryProductsDto) {
    // Branch scoping invariant:
    // If Owner: view all branches, or filter by requested branchId.
    // If Staff: permanently locked to user.branchId.
    const resolvedBranchId = user.isOwner ? query.branchId : (user.branchId ?? undefined);

    const search = query.search?.trim();

    return this.prisma.product.findMany({
      where: {
        organizationId: user.organizationId,
        ...(resolvedBranchId ? { branchId: resolvedBranchId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { sku: { contains: search } },
                { category: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        branch: {
          select: { id: true, name: true, city: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Permanently deletes a product (Owner only).
   */
  async delete(organizationId: string, productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return this.prisma.product.delete({
      where: { id: product.id },
    });
  }

  /**
   * Organizes stock, category, or branch assignment.
   * Enforces that Staff can only modify products currently in their assigned branch.
   */
  async organize(user: AuthenticatedUser, productId: string, dto: OrganizeProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId: user.organizationId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Security invariant: Staff can only organize products within their assigned branch
    if (!user.isOwner && product.branchId !== user.branchId) {
      throw new ForbiddenException(
        "Staff can only organize products belonging to their assigned branch",
      );
    }

    // If reassigning to another branch, verify destination branch belongs to this org
    if (dto.branchId && dto.branchId !== product.branchId) {
      const destinationBranch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, organizationId: user.organizationId },
      });

      if (!destinationBranch) {
        throw new NotFoundException("Destination branch not found in this organization");
      }
    }

    return this.prisma.product.update({
      where: { id: product.id },
      data: {
        ...(dto.category ? { category: dto.category.trim() } : {}),
        ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
        ...(dto.branchId ? { branchId: dto.branchId } : {}),
      },
      include: {
        branch: {
          select: { id: true, name: true, city: true },
        },
      },
    });
  }
}
