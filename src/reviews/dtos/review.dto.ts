import { IsMongoId, IsNotEmpty, IsNumber, IsString, IsArray, IsOptional, Min, Max, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CommentDto {
  @ApiProperty({ example: '60d21b4667d0d8992e610c85', description: 'ID người dùng (ObjectId)', type: String })
  @IsMongoId()
  @IsNotEmpty()
  user: string;

  @ApiProperty({ example: 5, description: 'Điểm đánh giá (1-5)' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Sản phẩm rất tốt!', description: 'Nội dung bình luận', required: false })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({ example: ['img1.jpg', 'img2.jpg'], description: 'Danh sách ảnh', required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imgs?: string[];
}

export class ReviewDto {
  @ApiProperty({ example: '60d21b4967d0d8992e610c90', description: 'ID sản phẩm (ObjectId)', type: String })
  @IsMongoId()
  @IsNotEmpty()
  product: string;

  @ApiProperty({ type: [CommentDto], description: 'Danh sách bình luận' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommentDto)
  comments: CommentDto[];
} 