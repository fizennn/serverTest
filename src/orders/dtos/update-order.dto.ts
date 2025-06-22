import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOrderDto {
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