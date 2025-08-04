import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class PayOSWebhookDataDto {
  @ApiProperty({ example: '8835178226', description: 'Số tài khoản' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 2999, description: 'Số tiền (VND)' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'CS4X4PKS790 Don hang 287271', description: 'Mô tả giao dịch' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'dd3eaa5a-5d5b-40a6-9384-34909674b9c0', description: 'Reference ID' })
  @IsString()
  reference: string;

  @ApiProperty({ example: '2025-08-04 13:02:24', description: 'Thời gian giao dịch' })
  @IsString()
  transactionDateTime: string;

  @ApiProperty({ example: 'V3CAS8835178226', description: 'Số tài khoản ảo' })
  @IsString()
  virtualAccountNumber: string;

  @ApiProperty({ example: 287271, description: 'Mã đơn hàng' })
  @IsNumber()
  orderCode: number;

  @ApiProperty({ example: 'face0ed129154002aa02099aab7a445c', description: 'ID payment link' })
  @IsString()
  paymentLinkId: string;

  @ApiProperty({ example: '00', description: 'Mã trạng thái' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'success', description: 'Mô tả trạng thái' })
  @IsString()
  desc: string;

  @ApiProperty({ example: '', description: 'Counter account bank ID', required: false })
  @IsOptional()
  @IsString()
  counterAccountBankId?: string;

  @ApiProperty({ example: '', description: 'Counter account bank name', required: false })
  @IsOptional()
  @IsString()
  counterAccountBankName?: string;

  @ApiProperty({ example: null, description: 'Counter account name', required: false })
  @IsOptional()
  counterAccountName?: string | null;

  @ApiProperty({ example: null, description: 'Counter account number', required: false })
  @IsOptional()
  counterAccountNumber?: string | null;

  @ApiProperty({ example: '', description: 'Virtual account name', required: false })
  @IsOptional()
  @IsString()
  virtualAccountName?: string;

  @ApiProperty({ example: 'VND', description: 'Đơn vị tiền tệ' })
  @IsString()
  currency: string;
}

export class PayOSWebhookDto {
  @ApiProperty({ example: '00', description: 'Mã lỗi (00 = thành công)' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'success', description: 'Thông báo' })
  @IsString()
  desc: string;

  @ApiProperty({ example: true, description: 'Trạng thái thành công' })
  @IsBoolean()
  success: boolean;

  @ApiProperty({
    description: 'Dữ liệu webhook',
    type: PayOSWebhookDataDto
  })
  data: PayOSWebhookDataDto;

  @ApiProperty({ 
    example: 'c8f9fe4a88e30d48f3df25302d62ad0a5eb976e3a3e8fe86879153b26136c65d', 
    description: 'Chữ ký webhook' 
  })
  @IsString()
  signature: string;
} 