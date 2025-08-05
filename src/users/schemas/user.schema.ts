import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class Address {
  _id?: string;

  @Prop()
  name: string;

  @Prop({ required: true })
  phone!: string;

  @Prop({ required: true })
  address!: string;
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop({ required: true, default: false })
  isAdmin!: boolean;

  @Prop({ default: false })
  isActive!: boolean;

  @Prop({ type: String, default: null })
  refreshToken?: string | null;

  @Prop({ type: String, default: null })
  phoneNumber?: string | null;

  @Prop({ type: String, default: null })
  address?: string | null;

  @Prop({ type: String, default: null })
  city?: string | null;

  @Prop({ type: String, default: null })
  country?: string | null;

  @Prop({ type: String, default: null })
  postalCode?: string | null;

  @Prop({ type: Date, default: null })
  dateOfBirth?: Date | null | string;

  @Prop({ type: String, default: null })
  profilePicture?: string | null;

  @Prop({ type: [String], default: [] })
  favoriteProducts?: string[];

  @Prop({ type: Number, default: 0 })
  loyaltyPoints?: number;

  @Prop({ type: Date, default: null })
  lastLogin?: Date | null;

  @Prop({ type: Date, default: null })
  createdAt?: Date | null;

  @Prop({ type: [{ type: 'ObjectId', ref: 'Voucher' }], default: [] })
  vouchers?: string[];

  @Prop({ type: [Address], default: [] })
  addresses?: Address[];

  @Prop({ type: [String], default: [] })
  deviceId?: String[];

  // Vai trò - quyền hạn sẽ được lấy từ role thay vì từ các thuộc tính trực tiếp
  @Prop({ type: 'ObjectId', ref: 'Role', default: null })
  roleId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
