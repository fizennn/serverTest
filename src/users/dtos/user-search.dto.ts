import { IsString, IsOptional, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UserSearchDto {
  @ApiProperty({
    description: 'Từ khóa tìm kiếm (tên, email) hoặc ID user (ObjectId)',
    example: 'john hoặc 507f1f77bcf86cd799439011',
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
    description: 'Tên user',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Email user',
    example: 'john@example.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({
    description: 'Trạng thái hoạt động (true/false)',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsString()
  isActive?: string;

  @ApiProperty({
    description: 'ID vai trò',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  roleId?: string;

  @ApiProperty({
    description: 'Sắp xếp theo (name, email, createdAt, isActive)',
    example: 'createdAt',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    description: 'Thứ tự sắp xếp (asc, desc)',
    example: 'desc',
    required: false,
  })
  @IsOptional()
  @IsString()
  sortOrder?: string;
}
