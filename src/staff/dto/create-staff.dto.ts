import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateStaffDto {
  @ApiProperty({ example: "Rafi Ahmed", description: "Staff member full name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "rafi@demo.com", description: "Staff email address" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: "demo123",
    description: "Temporary password (minimum 6 characters)",
  })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({
    example: "branch_cuid_123",
    description: "ID of assigned branch",
  })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: "role_cuid_456", description: "ID of assigned role" })
  @IsString()
  @IsNotEmpty()
  roleId: string;
}
