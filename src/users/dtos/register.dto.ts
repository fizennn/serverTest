import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsMongoId } from 'class-validator';
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

export class CreateAdminUserDto {
  @ApiProperty({
    example: 'Admin User',
    minLength: 4,
    maxLength: 20,
    description: 'Tên người dùng (bắt buộc)',
  })
  @IsString()
  @MinLength(4, { message: 'Tên người dùng quá ngắn.' })
  @MaxLength(20, { message: 'Tên người dùng quá dài.' })
  name!: string;

  @ApiProperty({
    example: 'admin@example.com',
    description: 'Email (bắt buộc)',
  })
  @IsEmail({}, { message: 'Email đã tồn tại hoặc không hợp lệ' })
  email!: string;

  @ApiProperty({
    example: 'password123',
    minLength: 5,
    maxLength: 20,
    description: 'Mật khẩu (bắt buộc)',
  })
  @IsString()
  @MinLength(5, { message: 'Mật khẩu ít nhất 5 kí tự' })
  @MaxLength(20, { message: 'Mật khẩu k dài hơn 20 kí tự' })
  password!: string;

  @ApiProperty({
    example: '665f1e2b2c8b2a0012a4e123',
    description: 'ID của role (bắt buộc)',
  })
  @IsMongoId({ message: 'Role ID không hợp lệ' })
  roleId!: string;

  @ApiProperty({
    example: '0123456789',
    description: 'Số điện thoại (tùy chọn)',
    required: false,
  })
  @IsString()
  @MaxLength(20, { message: 'Số điện thoại quá dài.' })
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({
    example: '123 Đường ABC, Quận 1',
    description: 'Địa chỉ (tùy chọn)',
    required: false,
  })
  @IsString()
  @MaxLength(200, { message: 'Địa chỉ quá dài.' })
  @IsOptional()
  address?: string;

  @ApiProperty({
    example: 'TP.HCM',
    description: 'Thành phố (tùy chọn)',
    required: false,
  })
  @IsString()
  @MaxLength(50, { message: 'Tên thành phố quá dài.' })
  @IsOptional()
  city?: string;

  @ApiProperty({
    example: 'Việt Nam',
    description: 'Quốc gia (tùy chọn)',
    required: false,
  })
  @IsString()
  @MaxLength(50, { message: 'Tên quốc gia quá dài.' })
  @IsOptional()
  country?: string;

  @ApiProperty({
    example: '70000',
    description: 'Mã bưu điện (tùy chọn)',
    required: false,
  })
  @IsString()
  @MaxLength(20, { message: 'Mã bưu điện quá dài.' })
  @IsOptional()
  postalCode?: string;

  @ApiProperty({
    example: '1990-01-01',
    description: 'Ngày sinh (tùy chọn)',
    required: false,
  })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;
}

export class UpdateAdminUserDto {
  @ApiProperty({
    example: 'Admin User',
    minLength: 4,
    maxLength: 20,
    description: 'Tên người dùng (bắt buộc)',
  })
  @IsString()
  @MinLength(4, { message: 'Tên người dùng quá ngắn.' })
  @MaxLength(20, { message: 'Tên người dùng quá dài.' })
  name!: string;

  @ApiProperty({
    example: 'admin@example.com',
    description: 'Email (bắt buộc)',
  })
  @IsEmail({}, { message: 'Email đã tồn tại hoặc không hợp lệ' })
  email!: string;

  @ApiProperty({
    example: 'password123',
    minLength: 5,
    maxLength: 20,
    description: 'Mật khẩu (tùy chọn - chỉ cần truyền khi muốn thay đổi)',
    required: false,
  })
  @IsString()
  @MinLength(5, { message: 'Mật khẩu ít nhất 5 kí tự' })
  @MaxLength(20, { message: 'Mật khẩu k dài hơn 20 kí tự' })
  @IsOptional()
  password?: string;

  @ApiProperty({
    example: '665f1e2b2c8b2a0012a4e123',
    description: 'ID của role (bắt buộc)',
  })
  @IsMongoId({ message: 'Role ID không hợp lệ' })
  roleId!: string;

  @ApiProperty({
    example: '0123456789',
    description: 'Số điện thoại (tùy chọn)',
    required: false,
  })
  @IsString()
  @MaxLength(20, { message: 'Số điện thoại quá dài.' })
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({
    example: '123 Đường ABC, Quận 1',
    description: 'Địa chỉ (tùy chọn)',
    required: false,
  })
  @IsString()
  @MaxLength(200, { message: 'Địa chỉ quá dài.' })
  @IsOptional()
  address?: string;

  @ApiProperty({
    example: 'TP.HCM',
    description: 'Thành phố (tùy chọn)',
    required: false,
  })
  @IsString()
  @MaxLength(50, { message: 'Tên thành phố quá dài.' })
  @IsOptional()
  city?: string;

  @ApiProperty({
    example: 'Việt Nam',
    description: 'Quốc gia (tùy chọn)',
    required: false,
  })
  @IsString()
  @MaxLength(50, { message: 'Tên quốc gia quá dài.' })
  @IsOptional()
  country?: string;

  @ApiProperty({
    example: '70000',
    description: 'Mã bưu điện (tùy chọn)',
    required: false,
  })
  @IsString()
  @MaxLength(20, { message: 'Mã bưu điện quá dài.' })
  @IsOptional()
  postalCode?: string;

  @ApiProperty({
    example: '1990-01-01',
    description: 'Ngày sinh (tùy chọn)',
    required: false,
  })
  @IsString()
  @IsOptional()
  dateOfBirth?: string;
}
