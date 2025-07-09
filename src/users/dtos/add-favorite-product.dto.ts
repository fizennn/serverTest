import { IsString } from 'class-validator';

export class AddFavoriteProductDto {
  @IsString()
  productId: string;
} 