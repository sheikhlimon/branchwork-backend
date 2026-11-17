import { Controller, Get, Post, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { StaffService } from "./staff.service";
import { CreateStaffDto } from "./dto/create-staff.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { RequireOwner } from "../common/decorators/require-owner.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";

@ApiTags("Staff")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("staff")
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @RequirePermission("manage_staff")
  @ApiOperation({ summary: "List staff members in the organization" })
  @ApiResponse({
    status: 200,
    description: "Staff members retrieved successfully.",
  })
  @ApiResponse({
    status: 403,
    description: "Requires manage_staff permission or owner role.",
  })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.staffService.findAll(user.organizationId);
  }

  @Post()
  @RequirePermission("manage_staff")
  @ApiOperation({
    summary: "Invite or add a staff member (Requires manage_staff permission or Owner)",
  })
  @ApiResponse({ status: 201, description: "Staff member added successfully." })
  @ApiResponse({
    status: 403,
    description: "Requires manage_staff permission, owner role, and valid delegation clearance.",
  })
  @ApiResponse({ status: 409, description: "Email is already registered." })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStaffDto) {
    return this.staffService.create(user.organizationId, dto, user);
  }

  @Delete(":id")
  @RequireOwner()
  @ApiOperation({ summary: "Remove a staff member (Owner only)" })
  @ApiResponse({
    status: 200,
    description: "Staff member removed successfully.",
  })
  @ApiResponse({
    status: 403,
    description: "Requires organization owner role.",
  })
  @ApiResponse({ status: 404, description: "Staff member not found." })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.staffService.delete(user.organizationId, id);
  }
}
