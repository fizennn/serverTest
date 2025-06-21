import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'Nguyễn Văn Long',
    minLength: 4,
    maxLength: 20,
  })
  @IsString()
  @MinLength(4, { message: 'Tên người dùng quá ngắn.' })
  @MaxLength(20, { message: 'Tên người dùng quá dài.' })
  name!: string;

  @ApiProperty({
    example: 'thanhlong@gmail.com',
  })
  @IsEmail({}, { message: 'Email đã tồn tại hoặc không hợp lệ' })
  email!: string;

  @ApiProperty({
    example: 'password123',
    minLength: 5,
    maxLength: 20,
  })
  @IsString()
  @MinLength(5, { message: 'Mật khẩu ít nhất 5 kí tự' })
  @MaxLength(20, { message: 'Mật khẩu k dài hơn 20 kí tự' })
  password!: string;
}
