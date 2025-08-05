import { Injectable } from '@nestjs/common';
import { Expo } from 'expo-server-sdk';
import { PushNotificationDto } from './pushnotification.dto';

@Injectable()
export class NotificationService {
  private expo = new Expo();

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
}