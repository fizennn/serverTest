import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class PaymentQR {
  _id!: Types.ObjectId;

  @Prop({ required: true })
  qrUrl!: string;

  @Prop({ required: true, default: 'pending', enum: ['pending', 'paid', 'expired', 'cancelled'] })
  status!: string;

  @Prop({ required: true, default: Date.now })
  createdAt!: Date;

  @Prop({ required: true, default: Date.now })
  updatedAt!: Date;
}

export type PaymentQRDocument = PaymentQR & Document;
export const PaymentQRSchema = SchemaFactory.createForClass(PaymentQR); 