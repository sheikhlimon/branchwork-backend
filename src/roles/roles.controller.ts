import { Controller, Get, Post, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequireOwner } from "../common/decorators/require-owner.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";

@ApiTags("Roles")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({
    summary: "List roles and permission checklists for organization",
  })
  @ApiResponse({ status: 200, description: "Roles retrieved successfully." })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.rolesService.findAll(user.organizationId);
  }

  @Post()
  @RequireOwner()
  @ApiOperation({
    summary: "Create custom role with permission checklist (Owner only)",
  })
  @ApiResponse({ status: 201, description: "Role created successfully." })
  @ApiResponse({ status: 403, description: "Only owner can create roles." })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(user.organizationId, dto);
  }

  @Delete(":id")
  @RequireOwner()
  @ApiOperation({ summary: "Delete a role (Owner only)" })
  @ApiResponse({ status: 200, description: "Role deleted successfully." })
  @ApiResponse({ status: 403, description: "Only owner can delete roles." })
  @ApiResponse({ status: 404, description: "Role not found." })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.rolesService.delete(user.organizationId, id);
  }
}
