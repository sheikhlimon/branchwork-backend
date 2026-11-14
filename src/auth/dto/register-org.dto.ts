import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterOrgDto {
  @ApiProperty({ example: 'Padma Retail', description: 'Name of the organization' })
  @IsString()
  @IsNotEmpty()
  organizationName: string;

  @ApiProperty({ example: 'Nadia Rahman', description: 'Full name of the organization owner' })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty({ example: 'nadia@demo.com', description: 'Owner email address' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'demo123', description: 'Password (minimum 6 characters)' })
  @IsString()
  @MinLength(6)
  password: string;
}
