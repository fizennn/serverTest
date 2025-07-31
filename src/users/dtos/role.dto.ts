import { IsString, IsBoolean, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Tên vai trò',
    example: 'Product Manager',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Mô tả vai trò',
    example: 'Quản lý sản phẩm và danh mục',
    minLength: 10,
    maxLength: 200,
  })
  @IsString()
  description!: string;

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
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPost?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý voucher',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isVoucher?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý banner',
    example: false,
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
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isReturn?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý người dùng',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isUser?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý vai trò',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isRole?: boolean;

  @ApiProperty({
    description: 'Trạng thái hoạt động',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Thứ tự ưu tiên',
    example: 1,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  priority?: number;
}

export class UpdateRoleDto {
  @ApiProperty({
    description: 'Tên vai trò',
    example: 'Senior Product Manager',
    minLength: 2,
    maxLength: 50,
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Mô tả vai trò',
    example: 'Quản lý sản phẩm và danh mục cao cấp',
    minLength: 10,
    maxLength: 200,
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

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
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isPost?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý voucher',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isVoucher?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý banner',
    example: false,
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
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isReturn?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý người dùng',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isUser?: boolean;

  @ApiProperty({
    description: 'Quyền quản lý vai trò',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isRole?: boolean;

  @ApiProperty({
    description: 'Trạng thái hoạt động',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Thứ tự ưu tiên',
    example: 1,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  priority?: number;
}

export class RoleDto {
  @Expose()
  @ApiProperty({
    description: 'ID vai trò',
    example: '665f1e2b2c8b2a0012a4e123',
  })
  _id: string;

  @Expose()
  @ApiProperty({
    description: 'Tên vai trò',
    example: 'Product Manager',
  })
  name: string;

  @Expose()
  @ApiProperty({
    description: 'Mô tả vai trò',
    example: 'Quản lý sản phẩm và danh mục',
  })
  description: string;

  @Expose()
  @ApiProperty({
    description: 'Quyền quản lý đơn hàng',
    example: true,
  })
  isOrder: boolean;

  @Expose()
  @ApiProperty({
    description: 'Quyền quản lý sản phẩm',
    example: true,
  })
  isProduct: boolean;

  @Expose()
  @ApiProperty({
    description: 'Quyền quản lý danh mục',
    example: true,
  })
  isCategory: boolean;

  @Expose()
  @ApiProperty({
    description: 'Quyền quản lý bài viết',
    example: false,
  })
  isPost: boolean;

  @Expose()
  @ApiProperty({
    description: 'Quyền quản lý voucher',
    example: false,
  })
  isVoucher: boolean;

  @Expose()
  @ApiProperty({
    description: 'Quyền quản lý banner',
    example: false,
  })
  isBanner: boolean;

  @Expose()
  @ApiProperty({
    description: 'Quyền xem analytics',
    example: true,
  })
  isAnalytic: boolean;

  @Expose()
  @ApiProperty({
    description: 'Quyền quản lý đơn hàng trả',
    example: false,
  })
  isReturn: boolean;

  @Expose()
  @ApiProperty({
    description: 'Quyền quản lý người dùng',
    example: false,
  })
  isUser: boolean;

  @Expose()
  @ApiProperty({
    description: 'Quyền quản lý vai trò',
    example: false,
  })
  isRole: boolean;

  @Expose()
  @ApiProperty({
    description: 'Trạng thái hoạt động',
    example: true,
  })
  isActive: boolean;

  @Expose()
  @ApiProperty({
    description: 'Thứ tự ưu tiên',
    example: 1,
  })
  priority: number;

  @Expose()
  @ApiProperty({
    description: 'Ngày tạo',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Ngày cập nhật',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}

export class RolesResponseDto {
  @ApiProperty({
    description: 'Danh sách vai trò',
    type: [RoleDto],
  })
  items: RoleDto[];

  @ApiProperty({
    description: 'Tổng số vai trò',
    example: 5,
  })
  total: number;

  @ApiProperty({
    description: 'Trang hiện tại',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Tổng số trang',
    example: 1,
  })
  pages: number;
} 