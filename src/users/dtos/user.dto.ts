import { Expose, Transform, Type } from 'class-transformer';
import { ObjectId } from 'mongoose';

// Tạo DTO riêng cho Role để đảm bảo _id được giữ nguyên
export class RoleDto {
  @Expose()
  @Transform(({ key, obj }) => obj[key])
  _id!: ObjectId;

  @Expose()
  name!: string;

  @Expose()
  description!: string;

  @Expose()
  isOrder?: boolean;

  @Expose()
  isProduct?: boolean;

  @Expose()
  isCategory?: boolean;

  @Expose()
  isPost?: boolean;

  @Expose()
  isVoucher?: boolean;

  @Expose()
  isBanner?: boolean;

  @Expose()
  isAnalytic?: boolean;

  @Expose()
  isReturn?: boolean;

  @Expose()
  isUser?: boolean;

  @Expose()
  isRole?: boolean;

  @Expose()
  isActive?: boolean;

  @Expose()
  priority?: number;

  @Expose()
  createdAt?: Date;

  @Expose()
  updatedAt?: Date;
}

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

  @Expose()
  vouchers?: string[];

  @Expose()
  addresses?: any[];

  // Sử dụng RoleDto để đảm bảo _id được giữ nguyên
  @Expose()
  @Type(() => RoleDto)
  roleId?: RoleDto;
}
