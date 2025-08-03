import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema({ timestamps: true })
export class SimpleQR {
  _id!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, unique: true })
  orderId!: Types.ObjectId;

  @Prop({ required: true })
  qrUrl!: string;

  @Prop({ required: true, default: 'pending', enum: ['pending', 'paid', 'expired', 'cancelled'] })
  status!: string;

  @Prop({ required: true, default: Date.now })
  createdAt!: Date;

  @Prop({ required: true, default: Date.now })
  updatedAt!: Date;
}

export type SimpleQRDocument = SimpleQR & Document;
export const SimpleQRSchema = SchemaFactory.createForClass(SimpleQR); 