import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UserRoleUpdateDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsDefined()
  @IsEnum(UserRole)
  role: UserRole;
}
