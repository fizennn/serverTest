import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../../users/schemas/user.schema';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type BannerDocument = HydratedDocument<Banner>;

export enum BannerType {
  HOME = 'home',
  CATEGORY = 'category', 
  PRODUCT = 'product',
  PROMOTION = 'promotion',
  EVENT = 'event'
}

export enum LinkType {
  WEB = 'web',
  DEEPLINK = 'deeplink',
  INTERNAL = 'internal'
}

export enum BannerPosition {
  TOP = 'top',
  MIDDLE = 'middle', 
  BOTTOM = 'bottom',
  SIDEBAR = 'sidebar',
  POPUP = 'popup'
}

@Schema({ timestamps: true })
export class Banner {
  @ApiProperty({ description: 'ID của banner', example: '507f1f77bcf86cd799439011' })
  _id?: string;

  @Prop({ required: true })
  @ApiProperty({ 
    description: 'Tiêu đề banner', 
    example: 'Khuyến mãi Black Friday - Giảm đến 50%' 
  })
  title!: string;

  @Prop()
  @ApiProperty({ 
    description: 'Mô tả banner', 
    example: 'Cơ hội duy nhất trong năm! Hàng ngàn sản phẩm giảm giá sốc.',
    required: false
  })
  description?: string;

  @Prop({ required: true })
  @ApiProperty({ 
    description: 'URL ảnh banner', 
    example: 'https://example.com/banner-black-friday.jpg' 
  })
  imageUrl!: string;

  @Prop()
  @ApiProperty({ 
    description: 'URL ảnh banner cho mobile', 
    example: 'https://example.com/banner-black-friday-mobile.jpg',
    required: false
  })
  mobileImageUrl?: string;

  @Prop({ required: true, enum: LinkType })
  @ApiProperty({ 
    description: 'Loại link', 
    enum: LinkType,
    example: LinkType.WEB 
  })
  linkType!: LinkType;

  @Prop({ required: true })
  @ApiProperty({ 
    description: 'URL đích khi click banner', 
    examples: {
      web: { value: 'https://example.com/promotion', description: 'Link web thông thường' },
      deeplink: { value: 'myapp://product/123', description: 'Deep link vào app' },
      internal: { value: '/products/category/fashion', description: 'Link nội bộ trong app' }
    }
  })
  targetUrl!: string;

  @Prop({ required: true, enum: BannerType })
  @ApiProperty({ 
    description: 'Loại banner', 
    enum: BannerType,
    example: BannerType.PROMOTION 
  })
  type!: BannerType;

  @Prop({ required: true, enum: BannerPosition })
  @ApiProperty({ 
    description: 'Vị trí hiển thị banner', 
    enum: BannerPosition,
    example: BannerPosition.TOP 
  })
  position!: BannerPosition;

  @Prop({ required: true, default: 0 })
  @ApiProperty({ 
    description: 'Thứ tự hiển thị (số càng nhỏ hiển thị càng trước)', 
    example: 1 
  })
  order!: number;

  @Prop({ default: true })
  @ApiProperty({ 
    description: 'Trạng thái hiển thị banner', 
    example: true,
    default: true
  })
  isActive!: boolean;

  @Prop({ type: Date })
  @ApiProperty({ 
    description: 'Thời gian bắt đầu hiển thị', 
    example: '2024-11-01T00:00:00.000Z',
    required: false
  })
  startDate?: Date;

  @Prop({ type: Date })
  @ApiProperty({ 
    description: 'Thời gian kết thúc hiển thị', 
    example: '2024-11-30T23:59:59.000Z',
    required: false
  })
  endDate?: Date;

  @Prop({ default: 0 })
  @ApiProperty({ 
    description: 'Số lượt click', 
    example: 1250,
    default: 0
  })
  clickCount!: number;

  @Prop({ default: 0 })
  @ApiProperty({ 
    description: 'Số lượt hiển thị', 
    example: 50000,
    default: 0
  })
  viewCount!: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  })
  @ApiProperty({ description: 'User tạo banner (Admin)' })
  createdBy!: User;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  })
  @ApiProperty({ description: 'User cập nhật banner lần cuối' })
  lastUpdatedBy?: User;

  @Prop({ type: [String], default: [] })
  @ApiProperty({ 
    description: 'Tags để quản lý banner',
    example: ['black-friday', 'promotion', 'sale'],
    required: false
  })
  tags?: string[];

  @Prop()
  @ApiProperty({ 
    description: 'Ghi chú nội bộ', 
    example: 'Banner cho chiến dịch Black Friday 2024',
    required: false
  })
  notes?: string;

  @Prop({ default: false })
  @ApiProperty({ 
    description: 'Banner có mở trong tab mới không', 
    example: true,
    default: false
  })
  openInNewTab!: boolean;

  @Prop()
  @ApiProperty({ description: 'Thời gian tạo banner' })
  createdAt?: Date;

  @Prop()
  @ApiProperty({ description: 'Thời gian cập nhật banner' })
  updatedAt?: Date;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);

// Index cho performance
BannerSchema.index({ type: 1, position: 1, order: 1 });
BannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
BannerSchema.index({ createdAt: -1 });