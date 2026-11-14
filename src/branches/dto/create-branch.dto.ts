import { IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateBranchDto {
  @ApiProperty({
    example: "Dhanmondi",
    description: "Name of the branch location",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: "Dhaka",
    description: "City where the branch is located",
  })
  @IsString()
  @IsNotEmpty()
  city: string;
}
