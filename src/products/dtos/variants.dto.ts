import { IsString, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class SizeDto {
  @IsString()
  size: string;

  @IsNumber()
  stock: number;

  @IsNumber()
  price: number;
}

export class VariantDto {
  @IsString()
  color: string;

  @IsString()
  image: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SizeDto)
  sizes: SizeDto[];
}
