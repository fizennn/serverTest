import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: 'ObjectId', ref: 'User', required: true })
  userId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: Object, default: {} })
  metadata?: any;

  @Prop({ default: false })
  isRead!: boolean;

  @Prop({
    type: String,
    enum: [
      'info',
      'success',
      'warning',
      'error',
      'promotion',
      'order',
      'order_cancelled',
      'order_admin_created',
      'order_guest_created',
      'order_admin_cancelled',
      'order_updated',
      'order_delivered',
      'payment_status_updated',
      'refund',
      'system',
    ],
    default: 'info',
  })
  type!: string;

  @Prop({ type: Date, default: null })
  readAt?: Date | null;

  @Prop({ type: Date, default: Date.now })
  sentAt!: Date;

  @Prop({ default: false })
  deleted!: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Tạo index để query nhanh
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
