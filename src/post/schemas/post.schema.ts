import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../../users/schemas/user.schema';
import { Product } from '../../products/schemas/product.schema';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type PostDocument = HydratedDocument<Post>;

@Schema({ timestamps: true })
export class Comment {
  @ApiProperty({
    description: 'ID của comment',
    example: '507f1f77bcf86cd799439011',
  })
  _id?: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  })
  @ApiProperty({ description: 'User tạo comment' })
  user!: User;

  @Prop({ required: true })
  @ApiProperty({
    description: 'Nội dung comment',
    example: 'Sản phẩm này rất tốt!',
  })
  content!: string;

  @Prop({ type: [String], default: [] })
  @ApiProperty({
    description: 'Danh sách ảnh kèm theo comment',
    example: [
      'https://example.com/image1.jpg',
      'https://example.com/image2.jpg',
    ],
  })
  images?: string[];

  @Prop({ default: Date.now })
  @ApiProperty({ description: 'Thời gian tạo comment' })
  createdAt?: Date;

  @Prop({ default: Date.now })
  @ApiProperty({ description: 'Thời gian cập nhật comment' })
  updatedAt?: Date;
}

@Schema({ timestamps: true })
export class Post {
  @ApiProperty({
    description: 'ID của post',
    example: '507f1f77bcf86cd799439011',
  })
  _id?: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  })
  @ApiProperty({ description: 'User tạo post (chỉ admin)' })
  author!: User;

  @Prop({ required: true })
  @ApiProperty({
    description: 'Tiêu đề bài viết',
    example: 'Khuyến mãi đặc biệt cho sản phẩm mới',
  })
  title!: string;

  @Prop({ required: true })
  @ApiProperty({
    description: 'Nội dung bài viết',
    example:
      'Chúng tôi vui mừng giới thiệu bộ sưu tập mới với nhiều ưu đãi hấp dẫn...',
  })
  content!: string;

  @Prop({ type: [String], default: [] })
  @ApiProperty({
    description: 'Danh sách ảnh của bài viết',
    example: ['https://example.com/post1.jpg', 'https://example.com/post2.jpg'],
  })
  images?: string[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    default: [],
  })
  @ApiProperty({
    description: 'Danh sách sản phẩm được gắn vào bài viết',
    example: ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'],
  })
  attachedProducts?: Product[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  @ApiProperty({
    description: 'Danh sách user đã like bài viết',
    example: ['507f1f77bcf86cd799439014', '507f1f77bcf86cd799439015'],
  })
  likes?: User[];

  @Prop({ default: 0 })
  @ApiProperty({ description: 'Số lượt like', example: 25 })
  likeCount?: number;

  @Prop({ type: [Comment], default: [] })
  @ApiProperty({ description: 'Danh sách comment', type: [Comment] })
  comments?: Comment[];

  @Prop({ default: 0 })
  @ApiProperty({ description: 'Số lượng comment', example: 10 })
  commentCount?: number;

  @Prop({ type: [String], default: [] })
  @ApiProperty({
    description: 'Tags của bài viết',
    example: ['khuyến mãi', 'sản phẩm mới', 'thời trang'],
  })
  tags?: string[];

  @Prop({ default: true })
  @ApiProperty({ description: 'Trạng thái hiển thị bài viết', example: true })
  isActive?: boolean;

  @Prop({ default: false })
  @ApiProperty({ description: 'Bài viết nổi bật', example: false })
  isFeatured?: boolean;

  @Prop()
  @ApiProperty({ description: 'Thời gian tạo bài viết' })
  createdAt?: Date;

  @Prop()
  @ApiProperty({ description: 'Thời gian cập nhật bài viết' })
  updatedAt?: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
export const PostSchema = SchemaFactory.createForClass(Post);
