import { ApiProperty, PartialType } from '@nestjs/swagger';
import { 
  IsArray, 
  IsBoolean, 
  IsDateString, 
  IsEnum, 
  IsNotEmpty, 
  IsNumber, 
  IsOptional, 
  IsString, 
  IsUrl,
  Min,
  Max
} from 'class-validator';
import { Transform } from 'class-transformer';
import { BannerType, LinkType, BannerPosition } from '../schema/banner.schema';

export class CreateBannerDto {
  @ApiProperty({ 
    description: 'Tiêu đề banner', 
    example: 'Khuyến mãi Black Friday - Giảm đến 50%' 
  })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
  title!: string;

  @ApiProperty({ 
    description: 'Mô tả banner', 
    example: 'Cơ hội duy nhất trong năm! Hàng ngàn sản phẩm giảm giá sốc.',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  description?: string;

  @ApiProperty({ 
    description: 'URL ảnh banner', 
    example: 'https://example.com/banner-black-friday.jpg' 
  })
  @IsNotEmpty({ message: 'URL ảnh không được để trống' })
  @IsUrl({}, { message: 'URL ảnh không hợp lệ' })
  imageUrl!: string;

  @ApiProperty({ 
    description: 'URL ảnh banner cho mobile', 
    example: 'https://example.com/banner-black-friday-mobile.jpg',
    required: false
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL ảnh mobile không hợp lệ' })
  mobileImageUrl?: string;

  @ApiProperty({ 
    description: 'Loại link', 
    enum: LinkType,
    example: LinkType.WEB 
  })
  @IsNotEmpty({ message: 'Loại link không được để trống' })
  @IsEnum(LinkType, { message: 'Loại link không hợp lệ' })
  linkType!: LinkType;

  @ApiProperty({ 
    description: 'URL đích khi click banner', 
    example: 'https://example.com/promotion'
  })
  @IsNotEmpty({ message: 'URL đích không được để trống' })
  @IsString({ message: 'URL đích phải là chuỗi ký tự' })
  targetUrl!: string;

  @ApiProperty({ 
    description: 'Loại banner', 
    enum: BannerType,
    example: BannerType.PROMOTION 
  })
  @IsNotEmpty({ message: 'Loại banner không được để trống' })
  @IsEnum(BannerType, { message: 'Loại banner không hợp lệ' })
  type!: BannerType;

  @ApiProperty({ 
    description: 'Vị trí hiển thị banner', 
    enum: BannerPosition,
    example: BannerPosition.TOP 
  })
  @IsNotEmpty({ message: 'Vị trí banner không được để trống' })
  @IsEnum(BannerPosition, { message: 'Vị trí banner không hợp lệ' })
  position!: BannerPosition;

  @ApiProperty({ 
    description: 'Thứ tự hiển thị (0-999)', 
    example: 1,
    minimum: 0,
    maximum: 999
  })
  @IsNumber({}, { message: 'Thứ tự phải là số' })
  @Min(0, { message: 'Thứ tự phải từ 0 trở lên' })
  @Max(999, { message: 'Thứ tự không được vượt quá 999' })
  order!: number;

  @ApiProperty({ 
    description: 'Trạng thái hiển thị banner', 
    example: true,
    default: true,
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái phải là boolean' })
  isActive?: boolean;

  @ApiProperty({ 
    description: 'Thời gian bắt đầu hiển thị (ISO string)', 
    example: '2024-11-01T00:00:00.000Z',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  startDate?: string;

  @ApiProperty({ 
    description: 'Thời gian kết thúc hiển thị (ISO string)', 
    example: '2024-11-30T23:59:59.000Z',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  endDate?: string;

  @ApiProperty({ 
    description: 'Tags để quản lý banner',
    example: ['black-friday', 'promotion', 'sale'],
    required: false
  })
  @IsOptional()
  @IsArray({ message: 'Tags phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi tag phải là chuỗi ký tự' })
  tags?: string[];

  @ApiProperty({ 
    description: 'Ghi chú nội bộ', 
    example: 'Banner cho chiến dịch Black Friday 2024',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  notes?: string;

  @ApiProperty({ 
    description: 'Banner có mở trong tab mới không', 
    example: true,
    default: false,
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: 'openInNewTab phải là boolean' })
  openInNewTab?: boolean;
}

export class UpdateBannerDto extends PartialType(CreateBannerDto) {
  @ApiProperty({ 
    description: 'Tiêu đề banner', 
    example: 'Khuyến mãi Black Friday - Giảm đến 50%',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Tiêu đề phải là chuỗi ký tự' })
  title?: string;

  @ApiProperty({ 
    description: 'Mô tả banner', 
    example: 'Cơ hội duy nhất trong năm! Hàng ngàn sản phẩm giảm giá sốc.',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi ký tự' })
  description?: string;

  @ApiProperty({ 
    description: 'URL ảnh banner', 
    example: 'https://example.com/banner-black-friday.jpg',
    required: false
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL ảnh không hợp lệ' })
  @Transform(({ value }) => {
    console.log('DTO imageUrl transform:', value);
    return value;
  })
  imageUrl?: string;

  @ApiProperty({ 
    description: 'URL ảnh banner cho mobile', 
    example: 'https://example.com/banner-black-friday-mobile.jpg',
    required: false
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL ảnh mobile không hợp lệ' })
  mobileImageUrl?: string;

  @ApiProperty({ 
    description: 'Loại link', 
    enum: LinkType,
    example: LinkType.WEB,
    required: false
  })
  @IsOptional()
  @IsEnum(LinkType, { message: 'Loại link không hợp lệ' })
  linkType?: LinkType;

  @ApiProperty({ 
    description: 'URL đích khi click banner', 
    example: 'https://example.com/promotion',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'URL đích phải là chuỗi ký tự' })
  targetUrl?: string;

  @ApiProperty({ 
    description: 'Loại banner', 
    enum: BannerType,
    example: BannerType.PROMOTION,
    required: false
  })
  @IsOptional()
  @IsEnum(BannerType, { message: 'Loại banner không hợp lệ' })
  type?: BannerType;

  @ApiProperty({ 
    description: 'Vị trí hiển thị banner', 
    enum: BannerPosition,
    example: BannerPosition.TOP,
    required: false
  })
  @IsOptional()
  @IsEnum(BannerPosition, { message: 'Vị trí banner không hợp lệ' })
  position?: BannerPosition;

  @ApiProperty({ 
    description: 'Thứ tự hiển thị (0-999)', 
    example: 1,
    minimum: 0,
    maximum: 999,
    required: false
  })
  @IsOptional()
  @IsNumber({}, { message: 'Thứ tự phải là số' })
  @Min(0, { message: 'Thứ tự phải từ 0 trở lên' })
  @Max(999, { message: 'Thứ tự không được vượt quá 999' })
  order?: number;

  @ApiProperty({ 
    description: 'Trạng thái hiển thị banner', 
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái phải là boolean' })
  isActive?: boolean;

  @ApiProperty({ 
    description: 'Thời gian bắt đầu hiển thị (ISO string)', 
    example: '2024-11-01T00:00:00.000Z',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu không hợp lệ' })
  startDate?: string;

  @ApiProperty({ 
    description: 'Thời gian kết thúc hiển thị (ISO string)', 
    example: '2024-11-30T23:59:59.000Z',
    required: false
  })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc không hợp lệ' })
  endDate?: string;

  @ApiProperty({ 
    description: 'Tags để quản lý banner',
    example: ['black-friday', 'promotion', 'sale'],
    required: false
  })
  @IsOptional()
  @IsArray({ message: 'Tags phải là một mảng' })
  @IsString({ each: true, message: 'Mỗi tag phải là chuỗi ký tự' })
  tags?: string[];

  @ApiProperty({ 
    description: 'Ghi chú nội bộ', 
    example: 'Banner cho chiến dịch Black Friday 2024',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi ký tự' })
  notes?: string;

  @ApiProperty({ 
    description: 'Banner có mở trong tab mới không', 
    example: true,
    required: false
  })
  @IsOptional()
  @IsBoolean({ message: 'openInNewTab phải là boolean' })
  openInNewTab?: boolean;
}

export class BannerQueryDto {
  @ApiProperty({ 
    description: 'Trang hiện tại', 
    example: 1,
    default: 1,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Trang phải là số' })
  @Min(1, { message: 'Trang phải từ 1 trở lên' })
  page?: number;

  @ApiProperty({ 
    description: 'Số lượng banner mỗi trang', 
    example: 10,
    default: 10,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'Limit phải là số' })
  @Min(1, { message: 'Limit phải từ 1 trở lên' })
  @Max(100, { message: 'Limit không được vượt quá 100' })
  limit?: number;

  @ApiProperty({ 
    description: 'Lọc theo loại banner', 
    enum: BannerType,
    required: false
  })
  @IsOptional()
  @IsEnum(BannerType, { message: 'Loại banner không hợp lệ' })
  type?: BannerType;

  @ApiProperty({ 
    description: 'Lọc theo vị trí banner', 
    enum: BannerPosition,
    required: false
  })
  @IsOptional()
  @IsEnum(BannerPosition, { message: 'Vị trí banner không hợp lệ' })
  position?: BannerPosition;

  @ApiProperty({ 
    description: 'Lọc theo trạng thái', 
    example: true,
    required: false
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean({ message: 'Trạng thái phải là boolean' })
  isActive?: boolean;

  @ApiProperty({ 
    description: 'Tìm kiếm theo tiêu đề', 
    example: 'Black Friday',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Từ khóa tìm kiếm phải là chuỗi ký tự' })
  search?: string;

  @ApiProperty({ 
    description: 'Lọc theo tag', 
    example: 'promotion',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Tag phải là chuỗi ký tự' })
  tag?: string;

  @ApiProperty({ 
    description: 'Sắp xếp theo (createdAt, order, clickCount, viewCount)', 
    example: 'order',
    default: 'order',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Trường sắp xếp phải là chuỗi ký tự' })
  sortBy?: string;

  @ApiProperty({ 
    description: 'Thứ tự sắp xếp (asc, desc)', 
    example: 'asc',
    default: 'asc',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'Thứ tự sắp xếp phải là chuỗi ký tự' })
  sortOrder?: 'asc' | 'desc';
}

export class BannerClickDto {
  @ApiProperty({ 
    description: 'User Agent của thiết bị click', 
    example: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)...',
    required: false
  })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ 
    description: 'IP address của user', 
    example: '192.168.1.1',
    required: false
  })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ 
    description: 'Referrer URL', 
    example: 'https://example.com/home',
    required: false
  })
  @IsOptional()
  @IsString()
  referrer?: string;
}