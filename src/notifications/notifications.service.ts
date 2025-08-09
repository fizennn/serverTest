import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expo } from 'expo-server-sdk';
import { PushNotificationDto } from './pushnotification.dto';
import {
  Notification,
  NotificationDocument,
} from './schema/Notification.schema';
import { User } from '@/users/schemas/user.schema';

@Injectable()
export class NotificationService {
  private expo = new Expo();

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}
  async sendNotificationToAdmins(
    title: string,
    body: string,
    type: string = 'system',
    metadata?: any,
    sendPush: boolean = true,
    roleId?: string, // Thêm parameter roleId tùy chọn
  ) {
    try {
      let filter: any = { isActive: true }; // Chỉ gửi cho admin đang active
      
      if (roleId) {
        // Nếu có roleId cụ thể, tìm theo roleId đó
        filter.roleId = roleId;
      } else {
        // Nếu không có roleId, tìm tất cả user có isAdmin = true
        filter.isAdmin = true;
      }

      // Tìm tất cả admin theo filter
      const admins = await this.userModel
        .find(filter)
        .select('_id deviceId name email')
        .exec();

      if (admins.length === 0) {
        return {
          success: false,
          message: 'Không tìm thấy admin nào',
        };
      }

      const results = [];

      // Gửi thông báo cho từng admin
      for (const admin of admins) {
        const result = await this.sendAndSaveNotification(
          admin._id.toString(),
          sendPush ? admin.deviceId : null, // Chỉ gửi push nếu sendPush = true
          title,
          body,
          type,
          {
            ...metadata,
            targetRole: 'admin',
            adminId: admin._id.toString(),
          },
        );

        results.push({
          adminId: admin._id.toString(),
          adminName: admin.name,
          adminEmail: admin.email,
          result,
        });
      }

      return {
        success: true,
        message: `Đã gửi thông báo cho ${admins.length} admin`,
        totalAdmins: admins.length,
        results,
      };
    } catch (error) {
      console.error('Send notification to admins error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Gửi thông báo khẩn cấp cho admin (ví dụ: lỗi hệ thống)
  async sendUrgentNotificationToAdmins(
    title: string,
    body: string,
    metadata?: any,
    roleId?: string, // Thêm parameter roleId tùy chọn
  ) {
    return this.sendNotificationToAdmins(
      `🚨 ${title}`, // Thêm emoji để highlight
      body,
      'error',
      {
        ...metadata,
        urgent: true,
        priority: 'high',
      },
      true, // Bắt buộc gửi push
      roleId, // Truyền roleId nếu có
    );
  }
  // Hàm gốc của bạn
  async sendPushNotification(pushNotificationDto: PushNotificationDto) {
    const { userId, title, body, metadata } = pushNotificationDto;
    const user = await this.userModel.findById(userId);
    const notification = new this.notificationModel({
      userId,
      title,
      body,
      metadata: metadata || {},
      isRead: false,
      sentAt: new Date(),
    });

    const savedNotification = await notification.save();

    if (!Expo.isExpoPushToken(user.deviceId)) {
      throw new Error('Invalid push token');
    }

    const message = {
      to: user.deviceId,
      sound: 'default' as const,
      title: title,
      body: body,
      data: metadata || {},
    } as any;

    const tickets = await this.expo.sendPushNotificationsAsync([message]);
    return tickets;
  }

  // Hàm gửi thông báo VÀ lưu vào DB
  async sendAndSaveNotification(
    userId: string,
    pushToken: string,
    title: string,
    body: string,
    type: string = 'info',
    metadata?: any,
  ) {
    try {
      // 1. Lưu vào database trước
      const notification = new this.notificationModel({
        userId,
        title,
        body,
        type,
        metadata: metadata || {},
        isRead: false,
        sentAt: new Date(),
      });

      const savedNotification = await notification.save();

      // 2. Gửi push notification (nếu có token)
      let pushResult = { success: true, tickets: null };
      if (pushToken && Expo.isExpoPushToken(pushToken)) {
        const message = {
          to: pushToken,
          sound: 'default' as const,
          title,
          body,
          data: {
            ...metadata,
            notificationId: savedNotification._id.toString(),
          },
        };

        const tickets = await this.expo.sendPushNotificationsAsync([message]);
        pushResult = { success: true, tickets };
      }

      return {
        success: true,
        notification: savedNotification,
        pushResult,
      };
    } catch (error) {
      console.error('Send and save notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Gửi cho nhiều user và lưu từng cái
  async sendBulkAndSaveNotification(
    users: Array<{ userId: string; pushToken?: string }>,
    title: string,
    body: string,
    type: string = 'info',
    metadata?: any,
  ) {
    try {
      const results = [];

      for (const user of users) {
        const result = await this.sendAndSaveNotification(
          user.userId,
          user.pushToken,
          title,
          body,
          type,
          metadata,
        );
        results.push({ userId: user.userId, result });
      }

      return {
        success: true,
        results,
        totalSent: results.length,
      };
    } catch (error) {
      console.error('Bulk send and save error:', error);
      return { success: false, error: error.message };
    }
  }

  // Chỉ lưu thông báo mà không gửi push (cho thông báo hệ thống)
  async saveNotificationOnly(
    userId: string,
    title: string,
    body: string,
    type: string = 'info',
    metadata?: any,
  ) {
    try {
      const notification = new this.notificationModel({
        userId,
        title,
        body,
        type,
        metadata: metadata || {},
        isRead: false,
        sentAt: new Date(),
      });

      const savedNotification = await notification.save();
      return { success: true, notification: savedNotification };
    } catch (error) {
      console.error('Save notification error:', error);
      return { success: false, error: error.message };
    }
  }

  // Lấy danh sách thông báo của user
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
  ) {
    try {
      const filter: any = { userId, deleted: false };
      if (unreadOnly) {
        filter.isRead = false;
      }

      const notifications = await this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

      const total = await this.notificationModel.countDocuments(filter);

      return {
        success: true,
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('Get notifications error:', error);
      return { success: false, error: error.message };
    }
  }

  // Đánh dấu đã đọc
  async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await this.notificationModel.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true, readAt: new Date() },
        { new: true },
      );

      return { success: true, notification };
    } catch (error) {
      console.error('Mark as read error:', error);
      return { success: false, error: error.message };
    }
  }

  // Đánh dấu tất cả đã đọc
  async markAllAsRead(userId: string) {
    try {
      await this.notificationModel.updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() },
      );

      return { success: true };
    } catch (error) {
      console.error('Mark all as read error:', error);
      return { success: false, error: error.message };
    }
  }

  // Đếm thông báo chưa đọc
  async getUnreadCount(userId: string) {
    try {
      const count = await this.notificationModel.countDocuments({
        userId,
        isRead: false,
        deleted: false,
      });

      return { success: true, count };
    } catch (error) {
      console.error('Get unread count error:', error);
      return { success: false, error: error.message };
    }
  }

  // Gửi thông báo cho tất cả người dùng
  async sendNotificationToAllUsers(
    title: string,
    body: string,
    type: string = 'system',
    metadata?: any,
    sendPush: boolean = true,
    excludeInactive: boolean = true,
  ) {
    try {
      // Tìm tất cả user đang active (nếu excludeInactive = true)
      const filter: any = {};
      if (excludeInactive) {
        filter.isActive = true;
      }

      const users = await this.userModel
        .find(filter)
        .select('_id deviceId name email isActive')
        .exec();

      if (users.length === 0) {
        return {
          success: false,
          message: 'Không tìm thấy người dùng nào',
        };
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      // Gửi thông báo cho từng user
      for (const user of users) {
        try {
          const result = await this.sendAndSaveNotification(
            user._id.toString(),
            sendPush ? user.deviceId : null, // Chỉ gửi push nếu sendPush = true
            title,
            body,
            type,
            {
              ...metadata,
              targetType: 'all_users',
              userName: user.name,
              userEmail: user.email,
            },
          );

          if (result.success) {
            successCount++;
          } else {
            errorCount++;
          }

          results.push({
            userId: user._id.toString(),
            userName: user.name,
            userEmail: user.email,
            isActive: user.isActive,
            result,
          });
        } catch (error) {
          errorCount++;
          results.push({
            userId: user._id.toString(),
            userName: user.name,
            userEmail: user.email,
            isActive: user.isActive,
            result: { success: false, error: error.message },
          });
        }
      }

      return {
        success: true,
        message: `Đã gửi thông báo cho ${users.length} người dùng`,
        totalUsers: users.length,
        successCount,
        errorCount,
        results,
      };
    } catch (error) {
      console.error('Send notification to all users error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Gửi thông báo khẩn cấp cho tất cả người dùng
  async sendUrgentNotificationToAllUsers(
    title: string,
    body: string,
    metadata?: any,
  ) {
    return this.sendNotificationToAllUsers(
      `🚨 ${title}`, // Thêm emoji để highlight
      body,
      'error',
      {
        ...metadata,
        urgent: true,
        priority: 'high',
      },
      true, // Bắt buộc gửi push
      false, // Gửi cho cả user không active
    );
  }

  // Gửi thông báo khuyến mãi cho tất cả người dùng
  async sendPromotionNotificationToAllUsers(
    title: string,
    body: string,
    metadata?: any,
    ) {
    return this.sendNotificationToAllUsers(
      `🎉 ${title}`, // Thêm emoji để highlight
      body,
      'promotion',
      {
        ...metadata,
        promotion: true,
        priority: 'normal',
      },
      true, // Gửi push notification
      true, // Chỉ gửi cho user active
    );
  }
}
