import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOrderDto {
  @ApiProperty({
    description: 'Xác định đơn hàng mua tại cửa hàng (không tính phí ship)',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  atStore?: boolean;

  @ApiProperty({
    description: 'Phương thức thanh toán',
    example: 'COD',
    enum: ['COD', 'payOS'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['COD', 'payOS'])
  payment?: string;

  @ApiProperty({
    description: 'Trạng thái đơn hàng',
    example: 'confirmed',
    enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'])
  status?: string;

  @ApiProperty({
    description: 'Ghi chú đơn hàng',
    example: 'Đơn hàng đã được xác nhận',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}

export class OrderResponseDto {
  @ApiProperty({ description: 'ID của đơn hàng', example: '507f1f77bcf86cd799439011' })
  _id: string;

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

  @ApiProperty({ description: 'Trạng thái thanh toán', example: 'unpaid', enum: ['unpaid', 'paid', 'refunded'] })
  paymentStatus: string;

  @ApiProperty({ description: 'Tổng tiền đơn hàng', example: 940000 })
  total: number;

  @ApiProperty({ description: 'Ngày tạo đơn hàng', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class PaginatedOrderResponseDto {
  @ApiProperty({ type: [OrderResponseDto], description: 'Danh sách đơn hàng' })
  data: OrderResponseDto[];

  @ApiProperty({ example: 50, description: 'Tổng số lượng đơn hàng' })
  total: number;

  @ApiProperty({ example: 5, description: 'Tổng số trang' })
  pages: number;
} 

export class UpdateItemStatusDto {
  @ApiProperty({
    description: 'Trạng thái của item trong đơn hàng',
    example: 'processing',
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
  })
  @IsEnum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
  status!: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
}

// DTO đơn giản để test
export class SimpleUpdateItemStatusDto {
  @ApiProperty({
    description: 'Trạng thái của item trong đơn hàng',
    example: 'processing',
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
  })
  @IsEnum(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
}

// DTO mới với validation đầy đủ
export class UpdateItemStatusRequestDto {
  @ApiProperty({
    description: 'Trạng thái của item trong đơn hàng',
    example: 'processing',
    // Loại bỏ enum để cho phép truyền bất kỳ status nào
  })
  @IsString({
    message: 'Status phải là một chuỗi'
  })
  status!: string;
} 