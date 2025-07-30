import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, ArrayMaxSize } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ 
    description: 'Tiêu đề bài viết', 
    example: 'Khuyến mãi đặc biệt cho sản phẩm mới' 
  })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
  title!: string;

  @ApiProperty({ 
    description: 'Nội dung bài viết', 
    example: 'Chúng tôi vui mừng giới thiệu bộ sưu tập mới với nhiều ưu đãi hấp dẫn...' 
  })
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  @IsString({ message: 'Nội dung phải là chuỗi ký tự' })
  content!: string;

  @ApiProperty({ 
    description: 'Danh sách ảnh của bài viết (tối đa 10 ảnh)',
    example: ['https://example.com/post1.jpg', 'https://example.com/post2.jpg'],
    required: false
  })
  @IsOptional()
  @IsArray({ message: 'Images phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi ảnh phải là một URL hợp lệ' })
  @ArrayMaxSize(10, { message: 'Tối đa 10 ảnh cho mỗi bài viết' })
  images?: string[];

  @ApiProperty({ 
    description: 'Danh sách ID sản phẩm được gắn vào bài viết',
    example: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
    required: false
  })
  @IsOptional()
  @IsArray({ message: 'AttachedProducts phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi ID sản phẩm phải là chuỗi ký tự' })
  attachedProducts?: string[];

  @ApiProperty({ 
    description: 'Tags của bài viết',
    example: ['khuyến mãi', 'sản phẩm mới', 'thời trang'],
    required: false
  })
  @IsOptional()
  @IsArray({ message: 'Tags phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi tag phải là chuỗi ký tự' })
  tags?: string[];

  @ApiProperty({ 
    description: 'Trạng thái hiển thị bài viết', 
    example: true,
    default: true,
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive phải là boolean' })
  isActive?: boolean;

  @ApiProperty({ 
    description: 'Bài viết nổi bật', 
    example: false,
    default: false,
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: 'isFeatured phải là boolean' })
  isFeatured?: boolean;
}

export class UpdatePostDto extends PartialType(CreatePostDto) {}

export class CreateCommentDto {
  @ApiProperty({ 
    description: 'Nội dung comment', 
    example: 'Sản phẩm này rất tốt!' 
  })
  @IsNotEmpty({ message: 'Nội dung comment không được để trống' })
  @IsString({ message: 'Nội dung comment phải là chuỗi ký tự' })
  content!: string;

  @ApiProperty({ 
    description: 'Danh sách ảnh kèm theo comment (tối đa 5 ảnh)',
    example: ['https://example.com/comment1.jpg', 'https://example.com/comment2.jpg'],
    required: false
  })
  @IsOptional()
  @IsArray({ message: 'Images phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi ảnh phải là một URL hợp lệ' })
  @ArrayMaxSize(5, { message: 'Tối đa 5 ảnh cho mỗi comment' })
  images?: string[];
}

export class UpdateCommentDto {
  @ApiProperty({ 
    description: 'Nội dung comment cập nhật', 
    example: 'Sản phẩm này thực sự xuất sắc!',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Nội dung comment phải là chuỗi ký tự' })
  content?: string;

  @ApiProperty({ 
    description: 'Danh sách ảnh kèm theo comment (tối đa 5 ảnh)',
    example: ['https://example.com/comment1.jpg', 'https://example.com/comment2.jpg'],
    required: false
  })
  @IsOptional()
  @IsArray({ message: 'Images phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi ảnh phải là một URL hợp lệ' })
  @ArrayMaxSize(5, { message: 'Tối đa 5 ảnh cho mỗi comment' })
  images?: string[];
}

export class PostQueryDto {
  @ApiProperty({ 
    description: 'Trang hiện tại', 
    example: 1,
    default: 1,
    required: false
  })
  @IsOptional()
  page?: number;

  @ApiProperty({ 
    description: 'Số lượng bài viết mỗi trang', 
    example: 10,
    default: 10,
    required: false
  })
  @IsOptional()
  limit?: number;

  @ApiProperty({ 
    description: 'Tìm kiếm theo tiêu đề hoặc nội dung', 
    example: 'khuyến mãi',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ 
    description: 'Lọc theo tag', 
    example: 'thời trang',
    required: false
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiProperty({ 
    description: 'Chỉ lấy bài viết nổi bật', 
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ 
    description: 'Sắp xếp theo (createdAt, likeCount, commentCount)', 
    example: 'createdAt',
    default: 'createdAt',
    required: false
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ 
    description: 'Thứ tự sắp xếp (asc, desc)', 
    example: 'desc',
    default: 'desc',
    required: false
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}