import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { REQUIRE_OWNER_KEY } from "../decorators/require-owner.decorator";
import { REQUIRE_PERMISSION_KEY } from "../decorators/require-permission.decorator";
import type { AuthenticatedUser } from "../../auth/strategies/jwt.strategy";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireOwner = this.reflector.getAllAndOverride<boolean>(REQUIRE_OWNER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredPermission = this.reflector.getAllAndOverride<string>(REQUIRE_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no role/permission metadata is set on the route, allow access
    if (!requireOwner && !requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException("User authentication context is missing");
    }

    // Owner has unrestricted superadmin access
    if (user.isOwner) {
      return true;
    }

    // If route requires owner specifically and user is not owner, block
    if (requireOwner) {
      throw new ForbiddenException("Only the organization owner can perform this action");
    }

    // If route requires a specific permission, verify against staff role
    if (requiredPermission) {
      if (!user.roleId) {
        throw new ForbiddenException("No role assigned to this staff account");
      }

      const role = await this.prisma.role.findUnique({
        where: { id: user.roleId },
      });

      if (!role) {
        throw new ForbiddenException("Assigned role no longer exists");
      }

      const permissions: string[] = JSON.parse(role.permissions || "[]");
      if (!permissions.includes(requiredPermission)) {
        throw new ForbiddenException(`Missing required permission: ${requiredPermission}`);
      }
    }

    return true;
  }
}
