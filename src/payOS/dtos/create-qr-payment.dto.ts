import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsUrl } from 'class-validator';

export class CreateQRPaymentDto {
  @ApiProperty({ 
    example: '507f1f77bcf86cd799439011', 
    description: 'ID của QR code (MongoDB ObjectId)' 
  })
  @IsMongoId()
  _id: string;

  @ApiProperty({ 
    example: 'https://payos.vn/payment/123456', 
    description: 'URL thanh toán QR code' 
  })
  @IsUrl()
  qrUrl: string;
} 