import { IsOptional, IsNumber, IsString, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class OrganizeProductDto {
  @ApiPropertyOptional({ example: "Grocery", description: "Updated category" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 75, description: "Updated inventory stock count" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  stock?: number;

  @ApiPropertyOptional({
    example: "branch_cuid_456",
    description: "Reassign product to a new branch location",
  })
  @IsString()
  @IsOptional()
  branchId?: string;
}
