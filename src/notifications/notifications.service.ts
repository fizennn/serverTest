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
  ) {
    try {
      const adminRoleIds = [
        '6889ae1a4375cdf63deb4408',
        '6889aefe4375cdf63deb44cb',
      ];

      // Tìm tất cả admin có roleId trong danh sách
      const admins = await this.userModel
        .find({
          roleId: { $in: adminRoleIds },
          isActive: true, // Chỉ gửi cho admin đang active
        })
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
    );
  }
  // Hàm gốc của bạn
  async sendPushNotification(pushNotificationDto: PushNotificationDto) {
    const { token, title, body, metadata } = pushNotificationDto;

    if (!Expo.isExpoPushToken(token)) {
      throw new Error('Invalid push token');
    }

    const message = {
      to: token,
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
}
