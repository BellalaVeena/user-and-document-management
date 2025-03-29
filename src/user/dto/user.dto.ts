import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty } from 'class-validator';

export class UserDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  username: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  password: string;
}
