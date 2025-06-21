import { Expose, Transform } from 'class-transformer';
import { ObjectId } from 'mongoose';

export class UserDto {
  @Expose()
  email!: string;
  
  @Expose()
  @Transform(({ key, obj }) => obj[key])
  _id!: ObjectId;

  @Expose()
  name!: string;

  @Expose()
  isAdmin!: boolean;

  @Expose()
  isActive!: boolean;

  @Expose()
  phoneNumber?: string | null;

  @Expose()
  address?: string | null;

  @Expose()
  city?: string | null;

  @Expose()
  country?: string | null;

  @Expose()
  postalCode?: string | null;

  @Expose()
  dateOfBirth?: Date | null;

  @Expose()
  profilePicture?: string | null;

  @Expose()
  favoriteProducts?: any[];

  @Expose()
  loyaltyPoints?: number;

  @Expose()
  createdAt?: Date;

  @Expose()
  updatedAt?: Date;

}
