import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsNumber, Min, IsEnum, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ReturnItemDto {
  @ApiProperty({ description: 'ID sản phẩm', example: '507f1f77bcf86cd799439013' })
  @IsString()
  productId: string;

  @ApiProperty({ description: 'Số lượng trả', example: 1 })
  @Transform(({ value }) => parseInt(value))
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class ReturnOrderDto {
  @ApiProperty({ 
    description: 'Lý do trả hàng', 
    example: 'Sản phẩm không đúng mô tả' 
  })
  @IsString()
  reason: string;

  @ApiProperty({ 
    description: 'Mô tả chi tiết (không bắt buộc)', 
    example: 'Màu sắc khác với hình ảnh',
    required: false 
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Danh sách sản phẩm muốn trả', 
    type: [ReturnItemDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @ApiProperty({ 
    description: 'Danh sách hình ảnh đính kèm (không bắt buộc)', 
    type: [String],
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

export class UpdateReturnStatusDto {
  @ApiProperty({ 
    description: 'Trạng thái trả hàng', 
    enum: ['pending', 'approved', 'rejected', 'processing', 'completed'],
    example: 'approved' 
  })
  @IsEnum(['pending', 'approved', 'rejected', 'processing', 'completed'])
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';

  @ApiProperty({ 
    description: 'Ghi chú của admin', 
    example: 'Yêu cầu trả hàng được chấp nhận',
    required: false 
  })
  @IsOptional()
  @IsString()
  adminNote?: string;
}

export class PaginatedReturnOrderResponseDto {
  @ApiProperty({ description: 'Danh sách yêu cầu trả hàng', type: [Object] })
  data: any[];

  @ApiProperty({ description: 'Tổng số yêu cầu trả hàng', example: 50 })
  total: number;

  @ApiProperty({ description: 'Tổng số trang', example: 5 })
  pages: number;
}