import { IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";
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

  @ApiPropertyOptional({
    example: 1,
    description: "Page number (1-based index)",
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    example: 50,
    description: "Number of records per page",
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;
}
