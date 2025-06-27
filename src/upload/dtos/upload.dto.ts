import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateUploadDto {
  @ApiProperty({
    description: 'Mô tả file (tùy chọn)',
    example: 'Ảnh sản phẩm áo thun nam',
    required: false
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Thẻ phân loại file',
    example: ['product', 'banner', 'avatar'],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateUploadDto extends PartialType(CreateUploadDto) {
  @ApiProperty({
    description: 'Trạng thái file (active/inactive)',
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UploadResponseDto {
  @ApiProperty({
    description: 'ID của upload record',
    example: '507f1f77bcf86cd799439011'
  })
  _id: string;

  @ApiProperty({
    description: 'Tên gốc của file',
    example: 'anh-san-pham.jpg'
  })
  originalName: string;

  @ApiProperty({
    description: 'Tên file đã được đổi tên',
    example: 'image-1703123456789-123456789.jpg'
  })
  filename: string;

  @ApiProperty({
    description: 'Kích thước file (bytes)',
    example: 1024000
  })
  size: number;

  @ApiProperty({
    description: 'Loại MIME của file',
    example: 'image/jpeg'
  })
  mimetype: string;

  @ApiProperty({
    description: 'URL để truy cập file',
    example: 'https://170.64.217.145/v1/uploads/image-1703123456789-123456789.jpg'
  })
  url: string;

  @ApiProperty({
    description: 'Mô tả file',
    example: 'Ảnh sản phẩm áo thun nam'
  })
  description?: string;

  @ApiProperty({
    description: 'Thẻ phân loại file',
    example: ['product', 'banner']
  })
  tags?: string[];

  @ApiProperty({
    description: 'Trạng thái file',
    example: true
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Thời gian tạo',
    example: '2024-01-15T10:30:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Thời gian cập nhật',
    example: '2024-01-15T10:30:00.000Z'
  })
  updatedAt: Date;
} 