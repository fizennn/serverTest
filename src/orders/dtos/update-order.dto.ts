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