import { IsString, IsNumber, IsArray, IsOptional, IsDate, IsBoolean, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Type } from 'class-transformer';

export class CreateVoucherDto {
  @ApiProperty({ description: 'Loại voucher', example: 'item', enum: ['item', 'ship'] })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Phần trăm giảm giá', example: 10 })
  @IsNumber()
  disCount: number;

  @ApiProperty({ description: 'Điều kiện tối thiểu để sử dụng voucher', example: 500000 })
  @IsNumber()
  condition: number;

  @ApiProperty({ description: 'Giới hạn số tiền giảm giá tối đa', example: 100000 })
  @IsNumber()
  limit: number;

  @ApiProperty({ description: 'Số lượng voucher có sẵn', example: 100 })
  @IsNumber()
  stock: number;

  @ApiProperty({ description: 'Ngày bắt đầu hiệu lực' })
  @Type(() => Date)
  @IsDate()
  start: Date;

  @ApiProperty({ description: 'Ngày kết thúc hiệu lực' })
  @Type(() => Date)
  @IsDate()
  end: Date;

  @ApiProperty({ description: 'Danh sách user ID có thể sử dụng voucher', required: false })
  @IsArray()
  @IsOptional()
  userId?: string[];

  @ApiProperty({ description: 'Trạng thái vô hiệu hóa', example: false, required: false, default: false })
  @IsBoolean()
  @IsOptional()
  isDisable?: boolean;
}

export class UpdateVoucherDto {
  @ApiProperty({ description: 'Loại voucher', example: 'item', enum: ['item', 'ship'], required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ description: 'Phần trăm giảm giá', example: 10, required: false })
  @IsNumber()
  @IsOptional()
  disCount?: number;

  @ApiProperty({ description: 'Điều kiện tối thiểu để sử dụng voucher', example: 500000, required: false })
  @IsNumber()
  @IsOptional()
  condition?: number;

  @ApiProperty({ description: 'Giới hạn số tiền giảm giá tối đa', example: 100000, required: false })
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({ description: 'Số lượng voucher có sẵn', example: 100, required: false })
  @IsNumber()
  @IsOptional()
  stock?: number;

  @ApiProperty({ description: 'Ngày bắt đầu hiệu lực', required: false })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  start?: Date;

  @ApiProperty({ description: 'Ngày kết thúc hiệu lực', required: false })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  end?: Date;

  @ApiProperty({ description: 'Danh sách user ID có thể sử dụng voucher', required: false })
  @IsArray()
  @IsOptional()
  userId?: string[];

  @ApiProperty({ description: 'Trạng thái vô hiệu hóa', example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isDisable?: boolean;
}

export class CheckVoucherDto {
  @ApiProperty({ description: 'ID của user', example: '507f1f77bcf86cd799439011' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Tổng tiền sản phẩm', example: 1000000 })
  @IsNumber()
  subtotal: number;

  @ApiProperty({ description: 'Phí vận chuyển', example: 30000 })
  @IsNumber()
  shipCost: number;
}

export class BulkUpdateVoucherDto {
  @ApiProperty({ 
    description: 'Danh sách ID voucher cần cập nhật', 
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsMongoId({ each: true })
  voucherIds: string[];

  @ApiProperty({ 
    description: 'Dữ liệu cập nhật cho voucher',
    type: UpdateVoucherDto
  })
  updateData: UpdateVoucherDto;
}

export class CalculateMultipleVouchersDto {
  @ApiProperty({ description: 'ID của user', example: '507f1f77bcf86cd799439011' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Tổng tiền sản phẩm', example: 1000000 })
  @IsNumber()
  subtotal: number;

  @ApiProperty({ description: 'Phí vận chuyển', example: 30000 })
  @IsNumber()
  shipCost: number;

  @ApiProperty({ description: 'Danh sách ID voucher', example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'] })
  @IsArray()
  @IsString({ each: true })
  voucherIds: string[];
}

export class VoucherResponseDto {
  @ApiProperty({ description: 'ID của voucher', example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ 
    description: 'Loại voucher: item (giảm giá sản phẩm) hoặc ship (giảm giá vận chuyển)', 
    example: 'item', 
    enum: ['item', 'ship']
  })
  type: string;

  @ApiProperty({ description: 'Phần trăm giảm giá (%)', example: 10 })
  disCount: number;

  @ApiProperty({ description: 'Điều kiện tối thiểu để sử dụng voucher (VNĐ)', example: 500000 })
  condition: number;

  @ApiProperty({ description: 'Giới hạn số tiền giảm giá tối đa (VNĐ)', example: 100000 })
  limit: number;

  @ApiProperty({ description: 'Số lượng voucher có sẵn', example: 50 })
  stock: number;

  @ApiProperty({ description: 'Ngày bắt đầu hiệu lực', example: '2024-01-01T00:00:00.000Z' })
  start: Date;

  @ApiProperty({ description: 'Ngày kết thúc hiệu lực', example: '2024-12-31T23:59:59.999Z' })
  end: Date;

  @ApiProperty({ description: 'Danh sách user ID có thể sử dụng voucher', type: [String] })
  userId: string[];

  @ApiProperty({ description: 'Trạng thái vô hiệu hóa', example: false })
  isDisable: boolean;

  @ApiProperty({ description: 'Ngày tạo', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Ngày cập nhật cuối', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class PaginatedVoucherResponseDto {
  @ApiProperty({ type: [VoucherResponseDto] })
  data: VoucherResponseDto[];

  @ApiProperty({ example: 50, description: 'Tổng số lượng voucher' })
  total: number;

  @ApiProperty({ example: 5, description: 'Tổng số trang' })
  pages: number;
}

export class VoucherSearchDto {
  @ApiProperty({
    description: 'Từ khóa tìm kiếm (có thể là ID voucher hoặc text)',
    example: 'giảm giá hoặc 507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({
    description: 'Trang hiện tại',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({
    description: 'Số lượng item mỗi trang',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiProperty({
    description: 'Loại voucher',
    example: 'item',
    enum: ['item', 'ship'],
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: 'Trạng thái vô hiệu hóa',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsString()
  isDisable?: string;

  @ApiProperty({
    description: 'Ngày bắt đầu hiệu lực từ (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({
    description: 'Ngày kết thúc hiệu lực từ (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({
    description: 'Chỉ lấy voucher đang hoạt động',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  isActive?: string;

  @ApiProperty({
    description: 'Chỉ lấy voucher đã hết hạn',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsString()
  isExpired?: string;

  @ApiProperty({
    description: '% giảm giá tối thiểu',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsString()
  minDiscount?: string;

  @ApiProperty({
    description: '% giảm giá tối đa',
    example: 20,
    required: false,
  })
  @IsOptional()
  @IsString()
  maxDiscount?: string;

  @ApiProperty({
    description: 'Điều kiện tối thiểu (VNĐ)',
    example: 100000,
    required: false,
  })
  @IsOptional()
  @IsString()
  minCondition?: string;

  @ApiProperty({
    description: 'Điều kiện tối đa (VNĐ)',
    example: 1000000,
    required: false,
  })
  @IsOptional()
  @IsString()
  maxCondition?: string;

  @ApiProperty({
    description: 'Giới hạn giảm giá tối thiểu (VNĐ)',
    example: 10000,
    required: false,
  })
  @IsOptional()
  @IsString()
  minLimit?: string;

  @ApiProperty({
    description: 'Giới hạn giảm giá tối đa (VNĐ)',
    example: 100000,
    required: false,
  })
  @IsOptional()
  @IsString()
  maxLimit?: string;

  @ApiProperty({
    description: 'Số lượng stock tối thiểu',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsString()
  minStock?: string;

  @ApiProperty({
    description: 'Số lượng stock tối đa',
    example: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  maxStock?: string;

  @ApiProperty({
    description: 'Có stock hay không',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  hasStock?: string;

  @ApiProperty({
    description: 'ID user cụ thể để tìm voucher dành cho user đó',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiProperty({
    description: 'Voucher có user được chỉ định hay không',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  hasUsers?: string;

  @ApiProperty({
    description: 'Sắp xếp theo field',
    example: 'disCount',
    enum: ['disCount', 'condition', 'limit', 'stock', 'start', 'end', 'createdAt'],
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    description: 'Thứ tự sắp xếp',
    example: 'desc',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder?: string;

  @ApiProperty({
    description: 'Bao gồm voucher đã hết hạn',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsString()
  includeExpired?: string;

  @ApiProperty({
    description: 'Bao gồm voucher đã bị vô hiệu hóa',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsString()
  includeDisabled?: string;
} 