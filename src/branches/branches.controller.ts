import { Controller, Get, Post, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { BranchesService } from "./branches.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequireOwner } from "../common/decorators/require-owner.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";

@ApiTags("Branches")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("branches")
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @ApiOperation({ summary: "List all branches belonging to the organization" })
  @ApiResponse({ status: 200, description: "Branches retrieved successfully." })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.branchesService.findAll(user.organizationId);
  }

  @Post()
  @RequireOwner()
  @ApiOperation({ summary: "Create a new branch (Owner only)" })
  @ApiResponse({ status: 201, description: "Branch created successfully." })
  @ApiResponse({ status: 403, description: "Only owner can create branches." })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBranchDto) {
    return this.branchesService.create(user.organizationId, dto);
  }

  @Delete(":id")
  @RequireOwner()
  @ApiOperation({ summary: "Delete a branch (Owner only)" })
  @ApiResponse({ status: 200, description: "Branch deleted successfully." })
  @ApiResponse({ status: 403, description: "Only owner can delete branches." })
  @ApiResponse({ status: 404, description: "Branch not found." })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.branchesService.delete(user.organizationId, id);
  }
}
