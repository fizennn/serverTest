import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../../users/schemas/user.schema';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsOptional } from 'class-validator';

export type ChatHistoryDocument = HydratedDocument<ChatHistory>;

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ required: true, enum: ['user', 'model'] })
  role!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ required: true, default: Date.now })
  timestamp!: Date;

  @ApiProperty({
    description: 'Loại tin nhắn (inventory_check, general, etc.)',
    example: 'inventory_check',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Prop({ required: false })
  type?: string;

  @ApiProperty({
    description: 'ID dữ liệu được tìm thấy',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Prop({ required: false })
  dataId?: string;

  @ApiProperty({
    description: 'Dữ liệu sản phẩm (khi type là inventory_check)',
    required: false,
  })
  @IsOptional()
  @Prop({ required: false, type: mongoose.Schema.Types.Mixed })
  productData?: any;
}

@Schema({ timestamps: true })
export class ChatHistory {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  })
  user!: User;

  @ApiProperty({
    description: 'Tiêu đề cuộc hội thoại',
    example: 'Hỏi về sản phẩm',
  })
  @IsString()
  @Prop({ required: true })
  title!: string;

  @ApiProperty({
    description: 'Mảng các tin nhắn trong cuộc hội thoại',
    type: [ChatMessage],
  })
  @Prop({ type: [ChatMessage], default: [] })
  messages!: ChatMessage[];

  @ApiProperty({
    description: 'Trạng thái cuộc hội thoại',
    example: true,
    default: true,
  })
  @Prop({ required: true, default: true })
  isActive!: boolean;

  @ApiProperty({
    description: 'Thời gian bắt đầu cuộc hội thoại',
    example: new Date(),
  })
  @IsDate()
  @Prop({ required: true, default: Date.now })
  startedAt!: Date;

  @ApiProperty({
    description: 'Thời gian kết thúc cuộc hội thoại',
    example: new Date(),
  })
  @IsOptional()
  @IsDate()
  @Prop({ default: null })
  endedAt?: Date;
}

export const ChatHistorySchema = SchemaFactory.createForClass(ChatHistory); 