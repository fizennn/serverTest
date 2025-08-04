import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUrl, IsArray, ValidateNested, IsEmail, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class PayOSItemDto {
  @ApiProperty({ example: 'Iphone', description: 'Tên sản phẩm' })
  @IsString()
  name: string;

  @ApiProperty({ example: 2, description: 'Số lượng' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 28000000, description: 'Giá sản phẩm' })
  @IsNumber()
  price: number;
}

// DTO mới đơn giản chỉ cần productId, quantity và amount
export class SimpleCreatePaymentDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'ID sản phẩm' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 2, description: 'Số lượng sản phẩm' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: 2000, description: 'Số tiền thanh toán (VNĐ)' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Nguyen Van A', description: 'Tên người mua', required: false })
  @IsString()
  @IsOptional()
  buyerName?: string;

  @ApiProperty({ example: 'buyer-email@gmail.com', description: 'Email người mua', required: false })
  @IsEmail()
  @IsOptional()
  buyerEmail?: string;

  @ApiProperty({ example: '090xxxxxxx', description: 'Số điện thoại người mua', required: false })
  @IsString()
  @IsOptional()
  buyerPhone?: string;

  @ApiProperty({ example: 'số nhà, đường, phường, tỉnh hoặc thành phố', description: 'Địa chỉ người mua', required: false })
  @IsString()
  @IsOptional()
  buyerAddress?: string;
}

export class CreatePaymentDto {
  @ApiProperty({ example: 123, description: 'Mã đơn hàng (orderCode)' })
  @IsNumber()
  orderCode: number;

  @ApiProperty({ example: 56000000, description: 'Số tiền thanh toán (VNĐ)' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'VQRIO123', description: 'Mô tả đơn hàng' })
  @IsString()
  description: string;

  @ApiProperty({ example: 'Nguyen Van A', description: 'Tên người mua' })
  @IsString()
  buyerName: string;

  @ApiProperty({ example: 'buyer-email@gmail.com', description: 'Email người mua' })
  @IsEmail()
  buyerEmail: string;

  @ApiProperty({ example: '090xxxxxxx', description: 'Số điện thoại người mua' })
  @IsString()
  buyerPhone: string;

  @ApiProperty({ example: 'số nhà, đường, phường, tỉnh hoặc thành phố', description: 'Địa chỉ người mua' })
  @IsString()
  buyerAddress: string;

  @ApiProperty({ type: [PayOSItemDto], description: 'Danh sách sản phẩm' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayOSItemDto)
  items: PayOSItemDto[];

  @ApiProperty({ example: 'https://your-cancel-url.com', description: 'URL khi hủy thanh toán' })
  @IsUrl()
  cancelUrl: string;

  @ApiProperty({ example: 'https://your-success-url.com', description: 'URL khi thanh toán thành công' })
  @IsUrl()
  returnUrl: string;

  @ApiProperty({ example: 1718000000, description: 'Thời gian hết hạn (timestamp)', required: false })
  @IsNumber()
  @IsOptional()
  expiredAt?: number;

  @ApiProperty({ example: 'string', description: 'Chữ ký xác thực (signature)', required: false })
  @IsString()
  @IsOptional()
  signature?: string;
}

export class CancelPaymentDto {
  @ApiProperty({ example: 'Khách hàng yêu cầu hủy', description: 'Lý do hủy thanh toán', required: false })
  @IsString()
  @IsOptional()
  cancellationReason?: string;
}

export class ConfirmWebhookDto {
  @ApiProperty({ example: 'https://your-domain.com/webhook/payos', description: 'URL webhook để nhận callback' })
  @IsString()
  webhookUrl: string;
} 