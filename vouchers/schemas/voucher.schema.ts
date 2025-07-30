import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VoucherDocument = Voucher & Document;

@Schema({ timestamps: true })
export class Voucher {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true, type: Number })
  disCount: number;

  @Prop({ required: true, type: Number })
  condition: number;

  @Prop({ required: true, type: Number })
  limit: number;

  @Prop({ required: true, type: Number })
  stock: number;

  @Prop({ required: true, type: Date })
  start: Date;

  @Prop({ required: true, type: Date })
  end: Date;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  userId: Types.ObjectId[];

  @Prop({ type: Boolean, default: false })
  isDisable: boolean;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher); 