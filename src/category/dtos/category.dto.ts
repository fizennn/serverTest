import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CategoryDto {
  @ApiProperty({
    description: 'Tên danh mục',
    example: 'Áo thun',
  })
  @IsString()
  readonly name: string;

  @ApiProperty({
    description: 'Mô tả danh mục',
    example: 'Các loại áo thun thời trang cho nam nữ',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiProperty({
    description: 'Đường dẫn hình ảnh đại diện cho danh mục',
    example: 'http://localhost:3001/uploads/category-tshirt.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  readonly imgUrl?: string;
} 