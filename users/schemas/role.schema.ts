import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoleDocument = HydratedDocument<Role>;

@Schema({ timestamps: true })
export class Role {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ type: Boolean, default: false })
  isOrder?: boolean;

  @Prop({ type: Boolean, default: false })
  isProduct?: boolean;

  @Prop({ type: Boolean, default: false })
  isCategory?: boolean;

  @Prop({ type: Boolean, default: false })
  isPost?: boolean;

  @Prop({ type: Boolean, default: false })
  isVoucher?: boolean;

  @Prop({ type: Boolean, default: false })
  isBanner?: boolean;

  @Prop({ type: Boolean, default: false })
  isAnalytic?: boolean;

  @Prop({ type: Boolean, default: false })
  isReturn?: boolean;

  @Prop({ type: Boolean, default: false })
  isUser?: boolean;

  @Prop({ type: Boolean, default: false })
  isRole?: boolean;

  @Prop({ type: Boolean, default: true })
  isActive?: boolean;

  @Prop({ type: Number, default: 0 })
  priority?: number; // Thứ tự ưu tiên của vai trò
}

export const RoleSchema = SchemaFactory.createForClass(Role); 