import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @ApiProperty({
    description: 'ID của size sản phẩm',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  sizeId!: string;

  @ApiProperty({
    description: 'Số lượng sản phẩm',
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  quantity!: number;
}

export class GuestCustomerInfo {
  @ApiProperty({
    description: 'Tên khách hàng',
    example: 'Nguyễn Văn A',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Số điện thoại khách hàng',
    example: '0123456789',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({
    description: 'Email khách hàng (không bắt buộc)',
    example: 'guest@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;
}

export class CreateOrderDto {
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
    enum: ['COD', 'payOS', 'GOOGLE_PAY'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['COD', 'payOS', 'GOOGLE_PAY'])
  payment?: string;

  @ApiProperty({
    description: 'Ghi chú đơn hàng',
    example: 'Giao hàng vào buổi chiều',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'ID địa chỉ giao hàng (từ danh sách địa chỉ của user)',
    example: '68551835dc75515b71ad59c6',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'Danh sách sản phẩm với số lượng',
    type: [OrderItemDto],
    example: [
      {
        sizeId: '507f1f77bcf86cd799439011',
        quantity: 2
      },
      {
        sizeId: '507f1f77bcf86cd799439012',
        quantity: 1
      }
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({
    description: 'Danh sách ID voucher. Hỗ trợ 2 loại: item (giảm giá sản phẩm) và ship (giảm giá vận chuyển). Mỗi voucher có điều kiện tối thiểu và giới hạn giảm giá riêng.',
    type: [String],
    required: false,
    example: ['68565473537f64f28418e85c', '68565473537f64f28418e85d'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vouchers?: string[];

  @ApiProperty({
    description: 'Địa chỉ cửa hàng',
    example: '123 Đường ABC, Quận 1, TP.HCM',
    required: false,
  })
  @IsOptional()
  @IsString()
  storeAddress?: string;

  @ApiProperty({
    description: 'Phí vận chuyển',
    example: 30000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  shipCost?: number;
}

export class CreateOrderAdminDto {
  @ApiProperty({
    description: 'ID của người dùng đặt hàng',
    example: '507f1f77bcf86cd799439012',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;

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
    enum: ['COD', 'payOS', 'GOOGLE_PAY'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['COD', 'payOS', 'GOOGLE_PAY'])
  payment?: string;

  @ApiProperty({
    description: 'Ghi chú đơn hàng',
    example: 'Giao hàng vào buổi chiều',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'Danh sách sản phẩm với số lượng',
    type: [OrderItemDto],
    example: [
      {
        sizeId: '507f1f77bcf86cd799439011',
        quantity: 2
      },
      {
        sizeId: '507f1f77bcf86cd799439012',
        quantity: 1
      }
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({
    description: 'Danh sách ID voucher. Hỗ trợ 2 loại: item (giảm giá sản phẩm) và ship (giảm giá vận chuyển). Mỗi voucher có điều kiện tối thiểu và giới hạn giảm giá riêng.',
    type: [String],
    required: false,
    example: ['68565473537f64f28418e85c', '68565473537f64f28418e85d'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vouchers?: string[];

  @ApiProperty({
    description: 'Địa chỉ cửa hàng',
    example: '123 Đường ABC, Quận 1, TP.HCM',
    required: false,
  })
  @IsOptional()
  @IsString()
  storeAddress?: string;

  @ApiProperty({
    description: 'Phí vận chuyển',
    example: 30000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  shipCost?: number;

  @ApiProperty({
    description: 'Trạng thái đơn hàng',
    example: 'pending',
    enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled', 'return'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled', 'return'])
  status?: string;

  @ApiProperty({
    description: 'Trạng thái thanh toán',
    example: 'unpaid',
    enum: ['unpaid', 'paid', 'refunded'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['unpaid', 'paid', 'refunded'])
  paymentStatus?: string;
}

export class CreateOrderGuestDto {
  @ApiProperty({
    description: 'Thông tin khách hàng (guest)',
    type: GuestCustomerInfo,
    required: true,
  })
  @ValidateNested()
  @Type(() => GuestCustomerInfo)
  customerInfo!: GuestCustomerInfo;

  @ApiProperty({
    description: 'Xác định đơn hàng mua tại cửa hàng (không tính phí ship)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  atStore?: boolean;

  @ApiProperty({
    description: 'Phương thức thanh toán',
    example: 'COD',
    enum: ['COD', 'payOS', 'GOOGLE_PAY'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['COD', 'payOS', 'GOOGLE_PAY'])
  payment?: string;

  @ApiProperty({
    description: 'Ghi chú đơn hàng',
    example: 'Khách hàng mua trực tiếp tại shop',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    description: 'Danh sách sản phẩm với số lượng',
    type: [OrderItemDto],
    example: [
      {
        sizeId: '507f1f77bcf86cd799439011',
        quantity: 2
      },
      {
        sizeId: '507f1f77bcf86cd799439012',
        quantity: 1
      }
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({
    description: 'Danh sách ID voucher. Hỗ trợ 2 loại: item (giảm giá sản phẩm) và ship (giảm giá vận chuyển). Mỗi voucher có điều kiện tối thiểu và giới hạn giảm giá riêng.',
    type: [String],
    required: false,
    example: ['68565473537f64f28418e85c', '68565473537f64f28418e85d'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vouchers?: string[];

  @ApiProperty({
    description: 'Địa chỉ cửa hàng',
    example: '123 Đường ABC, Quận 1, TP.HCM',
    required: false,
  })
  @IsOptional()
  @IsString()
  storeAddress?: string;

  @ApiProperty({
    description: 'Phí vận chuyển',
    example: 30000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  shipCost?: number;

  @ApiProperty({
    description: 'Trạng thái đơn hàng',
    example: 'confirmed',
    enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled', 'return'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'shipping', 'delivered', 'cancelled', 'return'])
  status?: string;

  @ApiProperty({
    description: 'Trạng thái thanh toán',
    example: 'paid',
    enum: ['unpaid', 'paid', 'refunded'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['unpaid', 'paid', 'refunded'])
  paymentStatus?: string;
}