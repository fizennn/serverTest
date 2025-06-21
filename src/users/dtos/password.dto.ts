import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Mật khẩu cũ' })
  @IsString()
  @MinLength(6)
  oldPassword?: string;

  @ApiProperty({ description: 'Mật khẩu mới' })
  @IsString()
  @MinLength(6)
  newPassword?: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email của người dùng' })
  @IsEmail()
  email?: string;
}