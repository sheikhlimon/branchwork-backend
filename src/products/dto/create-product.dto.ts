import { IsNotEmpty, IsNumber, IsPositive, IsString, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateProductDto {
  @ApiProperty({ example: "Mustard oil 1L", description: "Name of the product" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "OIL-001", description: "Unique stock keeping unit (SKU)" })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: "Grocery", description: "Product category" })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 112.6, description: "Unit price of the product" })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ example: 50, description: "Initial inventory stock count" })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ example: "branch_cuid_123", description: "Branch where product is stocked" })
  @IsString()
  @IsNotEmpty()
  branchId: string;
}
