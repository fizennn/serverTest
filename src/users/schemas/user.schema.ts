import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

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
  dateOfBirth?: Date | null;

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
}

export const UserSchema = SchemaFactory.createForClass(User);
