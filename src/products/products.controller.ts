import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { OrganizeProductDto } from "./dto/organize-product.dto";
import { QueryProductsDto } from "./dto/query-products.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { RequireOwner } from "../common/decorators/require-owner.decorator";
import { RequirePermission } from "../common/decorators/require-permission.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { AuthenticatedUser } from "../auth/strategies/jwt.strategy";

@ApiTags("Products")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermission("view_products")
  @ApiOperation({
    summary: "List products (Owner sees all; Staff is automatically scoped to their branch)",
  })
  @ApiResponse({ status: 200, description: "Products retrieved successfully." })
  @ApiResponse({ status: 403, description: "Requires view_products permission or owner role." })
  async findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryProductsDto) {
    return this.productsService.findAll(user, query);
  }

  @Post()
  @RequireOwner()
  @ApiOperation({ summary: "Create a new product SKU in a branch (Owner only)" })
  @ApiResponse({ status: 201, description: "Product created successfully." })
  @ApiResponse({ status: 403, description: "Only owner can create products." })
  @ApiResponse({ status: 409, description: "Product SKU already exists." })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.organizationId, dto);
  }

  @Delete(":id")
  @RequireOwner()
  @ApiOperation({ summary: "Delete a product (Owner only)" })
  @ApiResponse({ status: 200, description: "Product deleted successfully." })
  @ApiResponse({ status: 403, description: "Only owner can delete products." })
  @ApiResponse({ status: 404, description: "Product not found." })
  async delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.productsService.delete(user.organizationId, id);
  }

  @Patch(":id/organize")
  @RequirePermission("organize_products")
  @ApiOperation({
    summary:
      "Organize product stock, category, or branch (Staff can only organize their own branch)",
  })
  @ApiResponse({ status: 200, description: "Product organized successfully." })
  @ApiResponse({
    status: 403,
    description: "Requires organize_products permission and matching branch.",
  })
  @ApiResponse({ status: 404, description: "Product or destination branch not found." })
  async organize(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: OrganizeProductDto,
  ) {
    return this.productsService.organize(user, id, dto);
  }
}
