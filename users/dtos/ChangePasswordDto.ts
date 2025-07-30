import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mật khẩu hiện tại', example: 'oldPassword123' })
  @IsString()
  @IsNotEmpty()
  oldPassword?: string;

  @ApiProperty({ description: 'Mật khẩu mới', example: 'newPassword123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword?: string;
}