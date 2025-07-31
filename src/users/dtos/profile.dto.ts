import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsDate,
  ValidateNested,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddressDto {
  @IsString()
  @IsOptional()
  phone: string;

  @IsString()
  @IsOptional()
  address: string;
}

export class ProfileDto {
  @IsString()
  @MinLength(2, { message: 'Tên quá ngắn.' })
  @MaxLength(50, { message: 'Tên quá dài.' })
  @IsOptional()
  name?: string;

  @IsEmail({}, { message: 'Địa chỉ email không hợp lệ.' })
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu quá ngắn.' })
  @MaxLength(50, { message: 'Mật khẩu quá dài.' })
  @IsOptional()
  password?: string;

  @IsString()
  @MaxLength(15, { message: 'Số điện thoại quá dài.' })
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @MaxLength(200, { message: 'Địa chỉ quá dài.' })
  @IsOptional()
  address?: string;

  @IsString()
  @MaxLength(50, { message: 'Tên thành phố quá dài.' })
  @IsOptional()
  city?: string;

  @IsString()
  @MaxLength(50, { message: 'Tên quốc gia quá dài.' })
  @IsOptional()
  country?: string;

  @IsString()
  @MaxLength(20, { message: 'Mã bưu điện quá dài.' })
  @IsOptional()
  postalCode?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  favoriteProducts?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  @IsOptional()
  addresses?: AddressDto[];
}

export class UpdateUserDto {
  @IsString()
  @MinLength(2, { message: 'Tên quá ngắn.' })
  @MaxLength(50, { message: 'Tên quá dài.' })
  @IsOptional()
  name?: string;

  @IsEmail({}, { message: 'Địa chỉ email không hợp lệ.' })
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu quá ngắn.' })
  @IsOptional()
  password?: string;

  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  refreshToken?: string;

  @IsString()
  @MaxLength(20, { message: 'Số điện thoại quá dài.' })
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @MaxLength(200, { message: 'Địa chỉ quá dài.' })
  @IsOptional()
  address?: string;

  @IsString()
  @MaxLength(50, { message: 'Tên thành phố quá dài.' })
  @IsOptional()
  city?: string;

  @IsString()
  @MaxLength(50, { message: 'Tên quốc gia quá dài.' })
  @IsOptional()
  country?: string;

  @IsString()
  @MaxLength(20, { message: 'Mã bưu điện quá dài.' })
  @IsOptional()
  postalCode?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  favoriteProducts?: string[];

  @IsNumber()
  @Min(0, { message: 'Điểm thưởng không thể âm.' })
  @Max(999999, { message: 'Điểm thưởng quá cao.' })
  @IsOptional()
  loyaltyPoints?: number;

  @IsDateString()
  @IsOptional()
  lastLogin?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  vouchers?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  @IsOptional()
  addresses?: AddressDto[];

  // Quyền hạn mới
  @IsBoolean()
  @IsOptional()
  isOrder?: boolean;

  @IsBoolean()
  @IsOptional()
  isProduct?: boolean;

  @IsBoolean()
  @IsOptional()
  isCategory?: boolean;

  @IsBoolean()
  @IsOptional()
  isPost?: boolean;

  @IsBoolean()
  @IsOptional()
  isVoucher?: boolean;

  @IsBoolean()
  @IsOptional()
  isBanner?: boolean;

  @IsBoolean()
  @IsOptional()
  isAnalytic?: boolean;

  @IsBoolean()
  @IsOptional()
  isReturn?: boolean;

  @IsBoolean()
  @IsOptional()
  isUser?: boolean;
}