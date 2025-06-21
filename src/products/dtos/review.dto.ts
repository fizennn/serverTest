import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Min, Max } from 'class-validator';

export class ReviewDto {
  @Min(1)
  @Max(5)
  @IsNumber()
  @ApiProperty({
    description: 'Đánh giá sao',
    example: 5,
  })
  rating!: number;

  @IsString()
  @ApiProperty({
    description: 'Comment',
    example: 'Áo đẹp giá rẻ',
  })
  comment!: string;
}
