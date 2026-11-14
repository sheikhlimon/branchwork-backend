import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateRoleDto {
  @ApiProperty({ example: "Stock clerk", description: "Name of the role" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: "Handles shelf inventory and re-organization",
    description: "Role description",
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: ["view_products", "organize_products"],
    description: "List of permission slugs allowed for this role",
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
