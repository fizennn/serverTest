import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUrl, IsArray, ValidateNested, IsEmail, IsOptional, IsMongoId } from 'class-validator';
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

class BuyerInfoDto {
  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Tên người mua' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'test@example.com', description: 'Email người mua' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '0123456789', description: 'Số điện thoại người mua' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '123 Đường ABC, Quận 1, TP.HCM', description: 'Địa chỉ người mua' })
  @IsString()
  address: string;
}

export class CreateQRPaymentAutoDto {
  @ApiProperty({ example: '1', description: 'ID tự định nghĩa từ client' })
  @IsString()
  id: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'ID của đơn hàng' })
  @IsMongoId()
  orderId: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439012', description: 'ID của người dùng' })
  @IsMongoId()
  userId: string;

  @ApiProperty({ example: 123456, description: 'Mã đơn hàng (orderCode)' })
  @IsNumber()
  orderCode: number;

  @ApiProperty({ example: 100000, description: 'Số tiền thanh toán (VNĐ)' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'Thanh toán đơn hàng test', description: 'Mô tả đơn hàng' })
  @IsString()
  description: string;

  @ApiProperty({ type: BuyerInfoDto, description: 'Thông tin người mua' })
  @ValidateNested()
  @Type(() => BuyerInfoDto)
  buyerInfo: BuyerInfoDto;

  @ApiProperty({ type: [PayOSItemDto], description: 'Danh sách sản phẩm' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PayOSItemDto)
  items: PayOSItemDto[];

  @ApiProperty({ example: 'https://your-cancel-url.com', description: 'URL khi hủy thanh toán', required: false })
  @IsUrl()
  @IsOptional()
  cancelUrl?: string;

  @ApiProperty({ example: 'https://your-success-url.com', description: 'URL khi thanh toán thành công', required: false })
  @IsUrl()
  @IsOptional()
  returnUrl?: string;

  @ApiProperty({ example: 1718000000, description: 'Thời gian hết hạn (timestamp)', required: false })
  @IsNumber()
  @IsOptional()
  expiredAt?: number;
} 