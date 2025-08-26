import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsNumber, Min, IsEnum, ValidateNested, IsDateString, IsDate, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ReturnItemDto {
  @ApiProperty({ description: 'ID sản phẩm', example: '507f1f77bcf86cd799439013' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'ID của item trong order', example: '507f1f77bcf86cd799439014' })
  @IsString()
  itemId: string;

  @ApiProperty({ description: 'Số lượng trả', example: 1 })
  @Transform(({ value }) => parseInt(value))
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class ReturnOrderDto {
  @ApiProperty({ 
    description: 'Lý do trả hàng', 
    example: 'Sản phẩm không đúng mô tả' 
  })
  @IsString()
  reason: string;

  @ApiProperty({ 
    description: 'Mô tả chi tiết (không bắt buộc)', 
    example: 'Màu sắc khác với hình ảnh',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Danh sách sản phẩm muốn trả', 
    type: [ReturnItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @ApiProperty({ 
    description: 'Danh sách hình ảnh đính kèm (không bắt buộc)', 
    type: [String],
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiProperty({ 
    description: 'URL video đính kèm (không bắt buộc)', 
    example: 'https://example.com/video.mp4',
    required: false 
  })
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiProperty({ 
    description: 'Loại yêu cầu trả hàng', 
    enum: ['refund', 'exchange'],
    example: 'exchange',
    required: false,
    default: 'exchange'
  })
  @IsOptional()
  @IsEnum(['refund', 'exchange'])
  returnType?: 'refund' | 'exchange';
}

export class UpdateReturnStatusDto {
  @ApiProperty({ 
    description: 'Trạng thái trả hàng', 
    enum: ['pending', 'approved', 'rejected', 'processing', 'completed'],
    example: 'approved' 
  })
  @IsEnum(['pending', 'approved', 'rejected', 'processing', 'completed'])
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';

  @ApiProperty({ 
    description: 'Ghi chú của admin', 
    example: 'Yêu cầu trả hàng được chấp nhận',
    required: false 
  })
  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class PaginatedReturnOrderResponseDto {
  @ApiProperty({ description: 'Danh sách yêu cầu trả hàng', type: [Object] })
  data: any[];

  @ApiProperty({ description: 'Tổng số yêu cầu trả hàng', example: 50 })
  total: number;

  @ApiProperty({ description: 'Tổng số trang', example: 5 })
  pages: number;

  @ApiProperty({ description: 'Trang hiện tại', example: 1 })
  currentPage: number;

  @ApiProperty({ description: 'Số lượng item trên mỗi trang', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Có trang tiếp theo không', example: true })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Có trang trước đó không', example: false })
  hasPrevPage: boolean;
}

export enum ReturnOrderSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TOTAL_REFUND_AMOUNT = 'totalRefundAmount',
  STATUS = 'status',
  CUSTOMER_NAME = 'customerName'
}

export enum ReturnOrderSortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export class AdvancedSearchReturnOrderDto {
  @ApiProperty({
    description: 'Từ khóa tìm kiếm (ID yêu cầu trả hàng, tên/email khách hàng, ID đơn hàng gốc)',
    example: '507f1f77bcf86cd799439011',
    required: false
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({
    description: 'Trạng thái yêu cầu trả hàng',
    enum: ['pending', 'approved', 'rejected', 'processing', 'completed'],
    example: 'pending',
    required: false
  })
  @IsOptional()
  @IsEnum(['pending', 'approved', 'rejected', 'processing', 'completed'])
  status?: string;

  @ApiProperty({
    description: 'Loại yêu cầu trả hàng',
    enum: ['refund', 'exchange'],
    example: 'exchange',
    required: false
  })
  @IsOptional()
  @IsEnum(['refund', 'exchange'])
  returnType?: string;

  @ApiProperty({
    description: 'Ngày bắt đầu (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Ngày kết thúc (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Số tiền hoàn trả tối thiểu',
    example: 100000,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minRefundAmount?: number;

  @ApiProperty({
    description: 'Số tiền hoàn trả tối đa',
    example: 1000000,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxRefundAmount?: number;

  @ApiProperty({
    description: 'Trường sắp xếp',
    enum: ReturnOrderSortField,
    example: ReturnOrderSortField.CREATED_AT,
    required: false
  })
  @IsOptional()
  @IsEnum(ReturnOrderSortField)
  sortBy?: ReturnOrderSortField;

  @ApiProperty({
    description: 'Thứ tự sắp xếp',
    enum: ReturnOrderSortOrder,
    example: ReturnOrderSortOrder.DESC,
    required: false
  })
  @IsOptional()
  @IsEnum(ReturnOrderSortOrder)
  sortOrder?: ReturnOrderSortOrder;

  @ApiProperty({
    description: 'Trang hiện tại',
    example: 1,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({
    description: 'Số lượng item trên mỗi trang',
    example: 10,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}