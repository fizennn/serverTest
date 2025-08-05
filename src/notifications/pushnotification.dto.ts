import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PushNotificationDto {
  @ApiProperty({
    description: 'Mã token push của Expo',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    description: 'Tiêu đề thông báo',
    example: 'Xin chào!',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Nội dung/tin nhắn thông báo',
    example: 'Đây là thông báo thử nghiệm',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiProperty({
    description: 'Dữ liệu bổ sung/metadata gửi kèm với thông báo',
    example: { userId: '123', action: 'open_screen' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: object;
}
