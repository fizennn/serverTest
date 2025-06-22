import { IsString, IsNumber, IsArray, ValidateNested, IsBoolean, IsMongoId, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VariantDto } from './variants.dto';
import { Type, Transform } from 'class-transformer';

export class ProductDto {
  @ApiProperty({
    description: 'Tên sản phẩm',
    example: 'Áo thun nam cổ tròn',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Giá trung bình sản phẩm (định dạng: "giá thấp nhất - giá cao nhất" hoặc số đơn) - Không bắt buộc, sẽ tự động tính từ variants',
    example: '250000 - 350000',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Nếu là số, chuyển thành string format
    if (typeof value === 'number') {
      return `${value} - ${value}`;
    }
    // Nếu đã là string, giữ nguyên
    return value;
  })
  @IsString()
  averagePrice?: string;

  @ApiProperty({
    description: 'Mô tả sản phẩm',
    example: 'Áo thun chất liệu cotton thoáng mát, phù hợp mặc hàng ngày.',
  })
  @IsString()
  description!: string;

  @ApiProperty({
    description: 'Danh sách URL ảnh sản phẩm',
    example: [
      'http://localhost:3001/uploads/ao-thun-1.jpg',
      'http://localhost:3001/uploads/ao-thun-2.jpg',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  images!: string[];

  @ApiProperty({
    description: 'Thương hiệu sản phẩm',
    example: 'Uniqlo',
  })
  @IsString()
  brand!: string;

  @ApiProperty({
    description: 'Danh mục sản phẩm',
    example: 'Áo thun',
  })
  @IsString()
  category!: string;

  @ApiProperty({
    description: 'Số lượng tồn kho',
    example: 100,
  })
  @IsOptional()
  @IsNumber()
  countInStock: number;

  @ApiProperty({
    description: 'Trạng thái sản phẩm',
    example: true,
    default: true,
  })
  @IsBoolean()
  status!: boolean;

  @ApiProperty({
    description: 'Danh sách biến thể',
    example: [
      {
        "color": "Đen",
        "image": "black.jpg",
        "sizes": [
          { "size": "S", "stock": 10, "price": 250000 },
        ]
      }
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants!: VariantDto[];
}

export class VariantIdDto {
  @ApiProperty({
    description: 'ID của biến thể màu sắc',
    example: '68551b6f0bc19e44a4ae1920',
    required: true,
  })
  @IsMongoId({ message: 'ID biến thể phải là MongoDB ObjectId hợp lệ' })
  variantId: string;
}

export class SizeIdDto {
  @ApiProperty({
    description: 'ID của size',
    example: '68551b6f0bc19e44a4ae1921',
    required: true,
  })
  @IsMongoId({ message: 'ID size phải là MongoDB ObjectId hợp lệ' })
  sizeId: string;
}