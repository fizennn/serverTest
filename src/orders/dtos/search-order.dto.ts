import { ApiProperty } from '@nestjs/swagger';
import { 
  IsOptional, 
  IsString, 
  IsEnum, 
  IsNumber, 
  IsDateString,
  Min,
  Max,
  IsArray
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPING = 'shipping',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export enum SortField {
  CREATED_AT = 'createdAt',
  TOTAL = 'total',
  STATUS = 'status',
  CUSTOMER_NAME = 'customerName'
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export class AdvancedSearchOrderDto {
  @ApiProperty({
    description: 'Từ khóa tìm kiếm nhanh (mã đơn hàng, tên khách hàng)',
    example: 'ORD123456',
    required: false
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({
    description: 'Trạng thái đơn hàng',
    enum: OrderStatus,
    example: OrderStatus.PENDING,
    required: false
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({
    description: 'Trạng thái thanh toán',
    enum: ['unpaid', 'paid', 'refunded', 'cancelled', 'expired', 'failed', 'pending'],
    example: 'paid',
    required: false
  })
  @IsOptional()
  @IsEnum(['unpaid', 'paid', 'refunded', 'cancelled', 'expired', 'failed', 'pending'])
  paymentStatus?: string;

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
    description: 'Tổng tiền tối thiểu',
    example: 100000,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minTotal?: number;

  @ApiProperty({
    description: 'Tổng tiền tối đa',
    example: 1000000,
    required: false
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxTotal?: number;

  @ApiProperty({
    description: 'Phương thức thanh toán',
    enum: ['COD', 'payOS', 'GOOGLE_PAY'],
    example: 'COD',
    required: false
  })
  @IsOptional()
  @IsEnum(['COD', 'payOS', 'GOOGLE_PAY'])
  payment?: string;

  @ApiProperty({
    description: 'Mua tại cửa hàng',
    example: false,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  atStore?: boolean;

  @ApiProperty({
    description: 'Trường sắp xếp',
    enum: SortField,
    example: SortField.CREATED_AT,
    required: false
  })
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField;

  @ApiProperty({
    description: 'Thứ tự sắp xếp',
    enum: SortOrder,
    example: SortOrder.DESC,
    required: false
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

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

  @ApiProperty({
    description: 'Danh sách trạng thái đơn hàng (cho phép tìm kiếm nhiều trạng thái)',
    type: [String],
    enum: OrderStatus,
    example: [OrderStatus.PENDING, OrderStatus.CONFIRMED],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsEnum(OrderStatus, { each: true })
  statuses?: OrderStatus[];
}

export class SearchOrderResponseDto {
  @ApiProperty({ description: 'ID của đơn hàng', example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ 
    description: 'Mã đơn hàng',
    example: 123456
  })
  orderCode: number;

  @ApiProperty({ 
    description: 'Thông tin người dùng',
    type: 'object',
    properties: {
      _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
      name: { type: 'string', example: 'Nguyễn Văn A' },
      email: { type: 'string', example: 'user@example.com' }
    }
  })
  idUser: any;

  @ApiProperty({ description: 'Trạng thái đơn hàng', example: 'pending' })
  status: string;

  @ApiProperty({ description: 'Trạng thái thanh toán', example: 'unpaid' })
  paymentStatus: string;

  @ApiProperty({ description: 'Tổng tiền đơn hàng', example: 940000 })
  total: number;

  @ApiProperty({ description: 'Phương thức thanh toán', example: 'COD' })
  payment: string;

  @ApiProperty({ description: 'Mua tại cửa hàng', example: false })
  atStore: boolean;

  @ApiProperty({ description: 'Ngày tạo đơn hàng', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'Ngày cập nhật đơn hàng', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class PaginatedSearchOrderResponseDto {
  @ApiProperty({ type: [SearchOrderResponseDto], description: 'Danh sách đơn hàng' })
  data: SearchOrderResponseDto[];

  @ApiProperty({ example: 50, description: 'Tổng số lượng đơn hàng' })
  total: number;

  @ApiProperty({ example: 5, description: 'Tổng số trang' })
  pages: number;

  @ApiProperty({ example: 1, description: 'Trang hiện tại' })
  currentPage: number;

  @ApiProperty({ example: 10, description: 'Số lượng item trên mỗi trang' })
  limit: number;
} 