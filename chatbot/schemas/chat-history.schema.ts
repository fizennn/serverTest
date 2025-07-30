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