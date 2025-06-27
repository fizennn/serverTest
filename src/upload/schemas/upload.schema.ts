import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UploadDocument = Upload & Document;

@Schema({ timestamps: true })
export class Upload {
  @ApiProperty({
    description: 'Tên gốc của file',
    example: 'anh-san-pham.jpg'
  })
  @Prop({ required: true })
  originalName: string;

  @ApiProperty({
    description: 'Tên file đã được đổi tên',
    example: 'image-1703123456789-123456789.jpg'
  })
  @Prop({ required: true, unique: true })
  filename: string;

  @ApiProperty({
    description: 'Kích thước file (bytes)',
    example: 1024000
  })
  @Prop({ required: true })
  size: number;

  @ApiProperty({
    description: 'Loại MIME của file',
    example: 'image/jpeg'
  })
  @Prop({ required: true })
  mimetype: string;

  @ApiProperty({
    description: 'URL để truy cập file',
    example: 'https://170.64.217.145/v1/uploads/image-1703123456789-123456789.jpg'
  })
  @Prop({ required: true })
  url: string;

  @ApiProperty({
    description: 'Đường dẫn file trên server',
    example: './uploads/image-1703123456789-123456789.jpg'
  })
  @Prop({ required: true })
  path: string;

  @ApiProperty({
    description: 'Mô tả file (tùy chọn)',
    example: 'Ảnh sản phẩm áo thun nam',
    required: false
  })
  @Prop()
  description?: string;

  @ApiProperty({
    description: 'Thẻ phân loại file',
    example: ['product', 'banner', 'avatar'],
    required: false
  })
  @Prop({ type: [String], default: [] })
  tags?: string[];

  @ApiProperty({
    description: 'ID người dùng upload file',
    example: '507f1f77bcf86cd799439011',
    required: false
  })
  @Prop()
  uploadedBy?: string;

  @ApiProperty({
    description: 'Trạng thái file (active/inactive)',
    example: true,
    default: true
  })
  @Prop({ default: true })
  isActive: boolean;

  @ApiProperty({
    description: 'Thời gian tạo',
    example: '2024-01-15T10:30:00.000Z'
  })
  createdAt?: Date;

  @ApiProperty({
    description: 'Thời gian cập nhật',
    example: '2024-01-15T10:30:00.000Z'
  })
  updatedAt?: Date;
}

export const UploadSchema = SchemaFactory.createForClass(Upload); 