import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class RefreshTokenDto {
  @ApiProperty({
    example: "a8f5f167f44f4964e6c998dee827110c...",
    description: "Cryptographically secure refresh token issued during login or token refresh",
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
