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
import { JwtAuthGuard } from '@/guards';

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

    @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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

  @Post('send-to-all-users')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Gửi thông báo cho tất cả người dùng (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'body'],
      properties: {
        title: { type: 'string', description: 'Tiêu đề thông báo' },
        body: { type: 'string', description: 'Nội dung thông báo' },
        type: {
          type: 'string',
          description: 'Loại thông báo',
          enum: ['info', 'success', 'warning', 'error', 'promotion', 'order', 'system'],
          default: 'system',
        },
        sendPush: { type: 'boolean', description: 'Có gửi push notification không', default: true },
        excludeInactive: { type: 'boolean', description: 'Có loại trừ user không active không', default: true },
        metadata: { type: 'object', description: 'Dữ liệu bổ sung' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Gửi thông báo cho tất cả người dùng thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        totalUsers: { type: 'number' },
        successCount: { type: 'number' },
        errorCount: { type: 'number' },
        results: { type: 'array' },
      },
    },
  })
  async sendNotificationToAllUsers(
    @Body()
    body: {
      title: string;
      body: string;
      type?: string;
      sendPush?: boolean;
      excludeInactive?: boolean;
      metadata?: any;
    },
  ) {
    try {
      const result = await this.notificationService.sendNotificationToAllUsers(
        body.title,
        body.body,
        body.type || 'system',
        body.metadata,
        body.sendPush !== false, // Mặc định true
        body.excludeInactive !== false, // Mặc định true
      );

      if (!result.success) {
        throw new HttpException(result.message || result.error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('send-urgent-to-all-users')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Gửi thông báo khẩn cấp cho tất cả người dùng (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'body'],
      properties: {
        title: { type: 'string', description: 'Tiêu đề thông báo khẩn cấp' },
        body: { type: 'string', description: 'Nội dung thông báo khẩn cấp' },
        metadata: { type: 'object', description: 'Dữ liệu bổ sung' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Gửi thông báo khẩn cấp thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        totalUsers: { type: 'number' },
        successCount: { type: 'number' },
        errorCount: { type: 'number' },
        results: { type: 'array' },
      },
    },
  })
  async sendUrgentNotificationToAllUsers(
    @Body()
    body: {
      title: string;
      body: string;
      metadata?: any;
    },
  ) {
    try {
      const result = await this.notificationService.sendUrgentNotificationToAllUsers(
        body.title,
        body.body,
        body.metadata,
      );

      if (!result.success) {
        throw new HttpException(result.message || result.error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('send-promotion-to-all-users')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Gửi thông báo khuyến mãi cho tất cả người dùng (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'body'],
      properties: {
        title: { type: 'string', description: 'Tiêu đề thông báo khuyến mãi' },
        body: { type: 'string', description: 'Nội dung thông báo khuyến mãi' },
        metadata: { type: 'object', description: 'Dữ liệu bổ sung' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Gửi thông báo khuyến mãi thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        totalUsers: { type: 'number' },
        successCount: { type: 'number' },
        errorCount: { type: 'number' },
        results: { type: 'array' },
      },
    },
  })
  async sendPromotionNotificationToAllUsers(
    @Body()
    body: {
      title: string;
      body: string;
      metadata?: any;
    },
  ) {
    try {
      const result = await this.notificationService.sendPromotionNotificationToAllUsers(
        body.title,
        body.body,
        body.metadata,
      );

      if (!result.success) {
        throw new HttpException(result.message || result.error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('send-to-admins')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Gửi thông báo cho tất cả admin (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'body'],
      properties: {
        title: { type: 'string', description: 'Tiêu đề thông báo' },
        body: { type: 'string', description: 'Nội dung thông báo' },
        type: {
          type: 'string',
          description: 'Loại thông báo',
          enum: ['info', 'success', 'warning', 'error', 'system'],
          default: 'system',
        },
        sendPush: { type: 'boolean', description: 'Có gửi push notification không', default: true },
        roleId: { type: 'string', description: 'ID của role cụ thể (tùy chọn). Nếu không có sẽ gửi cho tất cả user có isAdmin = true' },
        metadata: { type: 'object', description: 'Dữ liệu bổ sung' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Gửi thông báo cho admin thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        totalAdmins: { type: 'number' },
        results: { type: 'array' },
      },
    },
  })
  async sendNotificationToAdmins(
    @Body()
    body: {
      title: string;
      body: string;
      type?: string;
      sendPush?: boolean;
      roleId?: string;
      metadata?: any;
    },
  ) {
    try {
      const result = await this.notificationService.sendNotificationToAdmins(
        body.title,
        body.body,
        body.type || 'system',
        body.metadata,
        body.sendPush !== false, // Mặc định true
        body.roleId, // Truyền roleId nếu có
      );

      if (!result.success) {
        throw new HttpException(result.message || result.error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('send-urgent-to-admins')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Gửi thông báo khẩn cấp cho tất cả admin (Admin only)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'body'],
      properties: {
        title: { type: 'string', description: 'Tiêu đề thông báo khẩn cấp' },
        body: { type: 'string', description: 'Nội dung thông báo khẩn cấp' },
        roleId: { type: 'string', description: 'ID của role cụ thể (tùy chọn). Nếu không có sẽ gửi cho tất cả user có isAdmin = true' },
        metadata: { type: 'object', description: 'Dữ liệu bổ sung' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Gửi thông báo khẩn cấp cho admin thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        totalAdmins: { type: 'number' },
        results: { type: 'array' },
      },
    },
  })
  async sendUrgentNotificationToAdmins(
    @Body()
    body: {
      title: string;
      body: string;
      roleId?: string;
      metadata?: any;
    },
  ) {
    try {
      const result = await this.notificationService.sendUrgentNotificationToAdmins(
        body.title,
        body.body,
        body.metadata,
        body.roleId, // Truyền roleId nếu có
      );

      if (!result.success) {
        throw new HttpException(result.message || result.error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return result;
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
