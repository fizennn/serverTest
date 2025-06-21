import { IsString, IsNumber, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VariantDto } from './variants.dto';
import { Type } from 'class-transformer';

export class ProductDto {
  @ApiProperty({
    description: 'Tên sản phẩm',
    example: 'Áo thun nam cổ tròn',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Giá sản phẩm (VND)',
    example: 250000,
  })
  @IsNumber()
  price!: number;

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
  @IsNumber()
  countInStock!: number;

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