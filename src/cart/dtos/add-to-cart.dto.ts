import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProductDocument } from 'src/products/schemas/product.schema';

export class AddToCartDto {

  @ApiProperty({
    description: 'Số lượng sản phẩm thêm vào giỏ hàng',
    example: 2,
  })
  @IsNumber()
  qty!: number;

  @ApiProperty({
    description: 'ID của sản phẩm',
    example: '60d5f483f1a2b1234567890a',
  })
  @IsString()
  productId!: string;
}