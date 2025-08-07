import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  Req,
  HttpStatus,
  HttpException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationService } from './notifications.service';
import { PushNotificationDto } from './pushnotification.dto';

@ApiTags('Thông báo')
@Controller('api/notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('push')
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
          id: { type: 'string', description: 'ID của thông báo' },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Token push không hợp lệ' })
  async sendPushNotification(@Body() pushNotificationDto: PushNotificationDto) {
    try {
      const tickets =
        await this.notificationService.sendPushNotification(
          pushNotificationDto,
        );
      return tickets;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo của user' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Trang hiện tại (mặc định: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng thông báo mỗi trang (mặc định: 20)',
  })
  @ApiQuery({
    name: 'unreadOnly',
    required: false,
    type: Boolean,
    description: 'Chỉ lấy thông báo chưa đọc (mặc định: false)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thông báo thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        notifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              userId: { type: 'string' },
              title: { type: 'string' },
              body: { type: 'string' },
              type: { type: 'string' },
              isRead: { type: 'boolean' },
              metadata: { type: 'object' },
              createdAt: { type: 'string', format: 'date-time' },
              sentAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  async getNotifications(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('unreadOnly') unreadOnly: boolean = false,
    @Req() req: any, // Lấy từ JWT token - req.user.id
  ) {
    try {
      // Nếu không có auth guard, có thể lấy userId từ query hoặc param
      const userId = req.user?.id || req.query.userId;

      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.notificationService.getUserNotifications(
        userId,
        Number(page),
        Number(limit),
        unreadOnly === true,
      );

      if (!result.success) {
        throw new HttpException(result.error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Đếm số thông báo chưa đọc' })
  @ApiResponse({
    status: 200,
    description: 'Lấy số lượng thông báo chưa đọc thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        count: { type: 'number' },
      },
    },
  })
  async getUnreadCount(@Req() req: any) {
    try {
      const userId = req.user?.id || req.query.userId;

      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.notificationService.getUnreadCount(userId);

      if (!result.success) {
        throw new HttpException(result.error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Đánh dấu thông báo đã đọc' })
  @ApiResponse({
    status: 200,
    description: 'Đánh dấu thông báo đã đọc thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        notification: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            isRead: { type: 'boolean' },
            readAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy thông báo' })
  async markAsRead(@Param('id') notificationId: string, @Req() req: any) {
    try {
      const userId = req.user?.id || req.query.userId;

      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.notificationService.markAsRead(
        notificationId,
        userId,
      );

      if (!result.success) {
        throw new HttpException(result.error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      if (!result.notification) {
        throw new HttpException('Notification not found', HttpStatus.NOT_FOUND);
      }

      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Put('mark-all-read')
  @ApiOperation({ summary: 'Đánh dấu tất cả thông báo đã đọc' })
  @ApiResponse({
    status: 200,
    description: 'Đánh dấu tất cả thông báo đã đọc thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  async markAllAsRead(@Req() req: any) {
    try {
      const userId = req.user?.id || req.query.userId;

      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.notificationService.markAllAsRead(userId);

      if (!result.success) {
        throw new HttpException(result.error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('send-and-save')
  @ApiOperation({ summary: 'Gửi và lưu thông báo (dành cho admin/system)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'title', 'body'],
      properties: {
        userId: { type: 'string', description: 'ID người dùng' },
        pushToken: { type: 'string', description: 'Token push notification' },
        title: { type: 'string', description: 'Tiêu đề thông báo' },
        body: { type: 'string', description: 'Nội dung thông báo' },
        type: {
          type: 'string',
          description: 'Loại thông báo',
          enum: [
            'info',
            'success',
            'warning',
            'error',
            'promotion',
            'order',
            'system',
          ],
          default: 'info',
        },
        metadata: { type: 'object', description: 'Dữ liệu bổ sung' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Gửi và lưu thông báo thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        notification: { type: 'object' },
        pushResult: { type: 'object' },
      },
    },
  })
  async sendAndSaveNotification(
    @Body()
    body: {
      userId: string;
      pushToken?: string;
      title: string;
      body: string;
      type?: string;
      metadata?: any;
    },
  ) {
    try {
      const result = await this.notificationService.sendAndSaveNotification(
        body.userId,
        body.pushToken,
        body.title,
        body.body,
        body.type || 'info',
        body.metadata,
      );

      if (!result.success) {
        throw new HttpException(result.error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // Endpoint để test gửi thông báo (không cần auth - chỉ dùng trong dev)
  @Get('user/:userId')
  @ApiOperation({ summary: 'Lấy thông báo theo userId (dành cho test)' })
  async getNotificationsByUserId(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('unreadOnly') unreadOnly: boolean = false,
  ) {
    try {
      const result = await this.notificationService.getUserNotifications(
        userId,
        Number(page),
        Number(limit),
        unreadOnly === true,
      );

      if (!result.success) {
        throw new HttpException(result.error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
