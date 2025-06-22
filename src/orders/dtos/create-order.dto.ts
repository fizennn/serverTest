import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
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

export class CreateOrderDto {
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
  })
  @IsString()
  @IsNotEmpty()
  address!: string;

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
  })
  @IsString()
  @IsNotEmpty()
  storeAddress!: string;

  @ApiProperty({
    description: 'Phí vận chuyển',
    example: 30000,
  })
  @IsNumber()
  @IsNotEmpty()
  shipCost!: number;
} 