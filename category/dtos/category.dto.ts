import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

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

  @ApiProperty({
    description: 'Trạng thái danh mục (active/inactive)',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  readonly status?: boolean;
}

export class CategorySearchDto {
  @ApiProperty({
    description: 'Từ khóa tìm kiếm (tên, mô tả)',
    example: 'áo thun',
    required: false,
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({
    description: 'Trang hiện tại',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({
    description: 'Số lượng item mỗi trang',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiProperty({
    description: 'Trạng thái danh mục (true/false)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({
    description: 'Sắp xếp theo (name, createdAt)',
    example: 'name',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    description: 'Thứ tự sắp xếp (asc, desc)',
    example: 'asc',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder?: string;
} 