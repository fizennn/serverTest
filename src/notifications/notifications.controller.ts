import { Controller, Post, Body, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { NotificationService } from './notifications.service';
import { PushNotificationDto } from './pushnotification.dto';

@ApiTags('Thông báo đẩy')
@Controller('api')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('push-notification')
  @ApiOperation({ summary: 'Gửi thông báo đẩy' })
  @ApiBody({ type: PushNotificationDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Gửi thông báo đẩy thành công',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Trạng thái gửi' },
          id: { type: 'string', description: 'ID của thông báo' }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Token push không hợp lệ' })
  async sendPushNotification(@Body() pushNotificationDto: PushNotificationDto) {
    try {
      const tickets = await this.notificationService.sendPushNotification(pushNotificationDto);
      return tickets;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}