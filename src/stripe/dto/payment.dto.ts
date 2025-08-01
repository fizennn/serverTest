import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({
    description: 'Số tiền thanh toán (đơn vị nhỏ nhất: cent cho USD, đồng cho VND)',
    example: 50000,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Loại tiền tệ',
    example: 'vnd',
    default: 'vnd',
  })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description: 'ID đơn hàng để liên kết với payment intent',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsString()
  @IsOptional()
  orderId?: string;
}

export class ConfirmPaymentDto {
  @ApiProperty({
    description: 'Payment Intent ID từ Stripe',
    example: 'pi_xxx',
  })
  @IsString()
  paymentIntentId: string;
}

export class PaymentStatusDto {
  @IsString()
  paymentIntentId: string;
} 