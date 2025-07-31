import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePermissionsDto {
  @ApiProperty({
    description: 'Quyền quản lý đơn hàng',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isOrder?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý sản phẩm',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isProduct?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý danh mục',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isCategory?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý bài viết',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPost?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý voucher',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isVoucher?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý banner',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isBanner?: boolean;

  @ApiProperty({
    description: 'Quyền xem analytics',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isAnalytic?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý đơn hàng trả',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isReturn?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý người dùng',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isUser?: boolean;
}

export class PermissionsDto {
  @ApiProperty({
    description: 'Quyền quản lý đơn hàng',
    example: true,
  })
  isOrder: boolean;

  @ApiProperty({
    description: 'Quyền quản lý sản phẩm',
    example: true,
  })
  isProduct: boolean;

  @ApiProperty({
    description: 'Quyền quản lý danh mục',
    example: true,
  })
  isCategory: boolean;

  @ApiProperty({
    description: 'Quyền quản lý bài viết',
    example: true,
  })
  isPost: boolean;

  @ApiProperty({
    description: 'Quyền quản lý voucher',
    example: true,
  })
  isVoucher: boolean;

  @ApiProperty({
    description: 'Quyền quản lý banner',
    example: true,
  })
  isBanner: boolean;

  @ApiProperty({
    description: 'Quyền xem analytics',
    example: true,
  })
  isAnalytic: boolean;

  @ApiProperty({
    description: 'Quyền quản lý đơn hàng trả',
    example: true,
  })
  isReturn: boolean;

  @ApiProperty({
    description: 'Quyền quản lý người dùng',
    example: true,
  })
  isUser: boolean;
} 