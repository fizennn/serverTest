import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ReturnOrder {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId: Types.ObjectId;

  @Prop({ required: true })
  reason: string;

  @Prop()
  description?: string;

  @Prop([{
    productId: { type: Types.ObjectId, ref: 'Product', required: true },
    itemId: { type: Types.ObjectId, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    variant: { type: String }
  }])
  items: Array<{
    productId: Types.ObjectId;
    itemId: Types.ObjectId;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    variant?: string;
  }>;

  @Prop({ required: true })
  totalRefundAmount: number;

  @Prop({ 
    enum: ['pending', 'approved', 'rejected', 'processing', 'completed'],
    default: 'pending'
  })
  status: string;

  @Prop({ 
    enum: ['refund', 'exchange'],
    default: 'exchange'
  })
  returnType: string;

  @Prop()
  adminNote?: string;

  @Prop({ type: Date })
  processedAt?: Date;

  @Prop({ type: [String] })
  images?: string[];

  @Prop()
  videoUrl?: string;
}

export type ReturnOrderDocument = ReturnOrder & Document;
export const ReturnOrderSchema = SchemaFactory.createForClass(ReturnOrder);
