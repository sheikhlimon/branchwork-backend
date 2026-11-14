import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class QueryProductsDto {
  @ApiPropertyOptional({
    example: "branch_cuid_123",
    description: "Filter by branch ID (Owner only; ignored for staff)",
  })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({
    example: "rice",
    description: "Search filter across name, SKU, or category",
  })
  @IsString()
  @IsOptional()
  search?: string;
}
