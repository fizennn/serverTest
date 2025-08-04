import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class PayOSWebhookDto {
  @ApiProperty({ example: 0, description: 'Mã lỗi (0 = thành công)' })
  @IsNumber()
  error: number;

  @ApiProperty({ example: 'Success', description: 'Thông báo' })
  @IsString()
  message: string;

  @ApiProperty({ 
    description: 'Dữ liệu webhook',
    example: {
      orderCode: '123456',
      amount: 2000000,
      status: 'PAID',
      transactionId: 'TXN123456',
      paymentMethod: 'BANK_TRANSFER',
      paidAt: 1640995200,
      description: 'Thanh toán đơn hàng #123456'
    }
  })
  data: {
    orderCode: string;
    amount: number;
    status: 'PAID' | 'PENDING' | 'CANCELLED' | 'EXPIRED' | 'FAILED';
    transactionId?: string;
    paymentMethod?: string;
    paidAt?: number;
    description?: string;
  };
} 