import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsDate, IsBoolean } from 'class-validator';

export class ChatMessageDto {
  @ApiProperty({
    description: 'Vai trò của tin nhắn (user hoặc model)',
    example: 'user',
    enum: ['user', 'model'],
  })
  @IsString()
  role!: string;

  @ApiProperty({
    description: 'Nội dung tin nhắn',
    example: 'Xin chào, tôi cần hỗ trợ về sản phẩm',
  })
  @IsString()
  content!: string;

  @ApiProperty({
    description: 'Thời gian gửi tin nhắn',
    example: new Date(),
  })
  @IsDate()
  timestamp!: Date;
}

export class SendMessageDto {
  @ApiProperty({
    description: 'Nội dung tin nhắn từ người dùng',
    example: 'Xin chào, tôi cần hỗ trợ về sản phẩm',
  })
  @IsString()
  message!: string;

  @ApiProperty({
    description: 'ID cuộc hội thoại (nếu có)',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class CreateConversationDto {
  @ApiProperty({
    description: 'Tiêu đề cuộc hội thoại',
    example: 'Hỏi về sản phẩm',
  })
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Tin nhắn đầu tiên',
    example: 'Xin chào, tôi cần hỗ trợ',
  })
  @IsString()
  initialMessage!: string;
}

export class ChatResponseDto {
  conversationId: string;
  response: string;
  timestamp: Date;
  type?: string;
  data?: any;
}

export class ChatHistoryDto {
  @ApiProperty({
    description: 'ID cuộc hội thoại',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  _id!: string;

  @ApiProperty({
    description: 'Tiêu đề cuộc hội thoại',
    example: 'Hỏi về sản phẩm',
  })
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'Mảng các tin nhắn',
    type: [ChatMessageDto],
  })
  @IsArray()
  messages!: ChatMessageDto[];

  @ApiProperty({
    description: 'Trạng thái cuộc hội thoại',
    example: true,
  })
  @IsBoolean()
  isActive!: boolean;

  @ApiProperty({
    description: 'Thời gian bắt đầu',
    example: new Date(),
  })
  @IsDate()
  startedAt!: Date;

  @ApiProperty({
    description: 'Thời gian kết thúc',
    example: new Date(),
    required: false,
  })
  @IsOptional()
  @IsDate()
  endedAt?: Date;
} 