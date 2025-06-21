import { IsString, IsNumber, IsArray, IsOptional, IsDate, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Type } from 'class-transformer';

export class CreateVoucherDto {
  @ApiProperty({ description: 'Loại voucher' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'Phần trăm giảm giá' })
  @IsNumber()
  disCount: number;

  @ApiProperty({ description: 'Điều kiện áp dụng (số tiền tối thiểu)' })
  @IsNumber()
  condition: number;

  @ApiProperty({ description: 'Giới hạn sử dụng' })
  @IsNumber()
  limit: number;

  @ApiProperty({ description: 'Số lượng voucher có sẵn' })
  @IsNumber()
  stock: number;

  @ApiProperty({ description: 'Ngày bắt đầu hiệu lực', example: '2025-06-21T06:04:44.036+00:00' })
  @Type(() => Date)
  @IsDate()
  start: Date;

  @ApiProperty({ description: 'Ngày kết thúc hiệu lực', example: '2025-07-21T23:59:59.999+00:00' })
  @Type(() => Date)
  @IsDate()
  end: Date;

  @ApiProperty({ description: 'Danh sách user ID được áp dụng', required: false })
  @IsOptional()
  @IsArray()
  userId?: Types.ObjectId[];
}

export class UpdateVoucherDto {
  @ApiProperty({ description: 'Loại voucher', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: 'Phần trăm giảm giá', required: false })
  @IsOptional()
  @IsNumber()
  disCount?: number;

  @ApiProperty({ description: 'Điều kiện áp dụng', required: false })
  @IsOptional()
  @IsNumber()
  condition?: number;

  @ApiProperty({ description: 'Giới hạn sử dụng', required: false })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiProperty({ description: 'Số lượng voucher có sẵn', required: false })
  @IsOptional()
  @IsNumber()
  stock?: number;

  @ApiProperty({ description: 'Ngày bắt đầu hiệu lực', required: false, example: '2025-06-21T06:04:44.036+00:00' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start?: Date;

  @ApiProperty({ description: 'Ngày kết thúc hiệu lực', required: false, example: '2025-07-21T23:59:59.999+00:00' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end?: Date;

  @ApiProperty({ description: 'Danh sách user ID được áp dụng', required: false })
  @IsOptional()
  @IsArray()
  userId?: Types.ObjectId[];

  @ApiProperty({ description: 'Vô hiệu hóa voucher', required: false })
  @IsOptional()
  @IsBoolean()
  isDisable?: boolean;
}

export class VoucherResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  disCount: number;

  @ApiProperty()
  condition: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  stock: number;

  @ApiProperty({ example: '2025-06-21T06:04:44.036+00:00' })
  start: Date;

  @ApiProperty({ example: '2025-07-21T23:59:59.999+00:00' })
  end: Date;

  @ApiProperty()
  userId: Types.ObjectId[];

  @ApiProperty()
  isDisable: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedVoucherResponseDto {
  @ApiProperty({ type: [VoucherResponseDto] })
  data: VoucherResponseDto[];

  @ApiProperty({ example: 50, description: 'Tổng số lượng voucher' })
  total: number;

  @ApiProperty({ example: 5, description: 'Tổng số trang' })
  pages: number;
} 