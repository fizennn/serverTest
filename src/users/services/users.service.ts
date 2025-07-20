import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User, UserDocument, Address } from '../schemas/user.schema';
import { CreateAddressDto, UpdateAddressDto } from '../dtos/address.dto';
import { hashPassword } from '@/utils/password';
import { generateUsers } from '@/utils/seed-users';
import { PaginatedResponse } from '../../shared/types';
import { MailService } from '@/mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { ProductsService } from '@/products/services/products.service';
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private mailService: MailService,
    private jwtService: JwtService,
    private productsService: ProductsService,
  ) {}

  async resetPassword(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    const newPassword = crypto.randomBytes(8).toString('hex'); // Tạo mật khẩu ngẫu nhiên (16 ký tự)
    const hashedPassword = await hashPassword(newPassword);

    await this.userModel
      .findByIdAndUpdate(user._id, { password: hashedPassword })
      .exec();
    await this.mailService.sendResetPasswordEmail(email, newPassword);
  }
  async findByEmail(email: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new BadRequestException('Email không tồn tại');
    }
    return user;
  }

  async create(user: Partial<User>): Promise<UserDocument> {
    try {
      const hashedPassword = await hashPassword(user.password ?? '');
      const newUser = await this.userModel.create({
        ...user,
        password: hashedPassword,
        isActive: false, // Tài khoản chưa kích hoạt
      });

      // Tạo token kích hoạt
      const activationToken = this.jwtService.sign(
        { sub: newUser._id, type: 'activation' },
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '10y' },
      );

      const res = await this.mailService.sendActivationEmail(
        newUser.email,
        newUser._id.toString(),
        activationToken,
      );
      return newUser;
    } catch (error: any) {
      this.logger.error(`Failed to create user: ${error.message}`);

      if (error.code === 11000) {
        throw new BadRequestException('Email already exists');
      }

      if (error.name === 'ValidationError') {
        throw new BadRequestException(error.message);
      }

      throw new BadRequestException('Failed to create user');
    }
  }

  async createMany(users: Partial<User>[]): Promise<UserDocument[]> {
    try {
      return (await this.userModel.insertMany(
        users,
      )) as unknown as UserDocument[];
    } catch (error: any) {
      this.logger.error(`Failed to create users: ${error.message}`);
      throw new BadRequestException('Failed to create users');
    }
  }

  async findOne(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email });
  }

  async findById(id: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<UserDocument>> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments({}),
    ]);

    return {
      items: users,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async deleteOne(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const result = await this.userModel.findOneAndDelete({ _id: id });
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async update(
    id: string,
    attrs: Partial<User>,
    isAdmin = false,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Chỉ lấy các trường cho phép cập nhật
    const updateData: Partial<User> = {};
    if (attrs.name !== undefined) updateData.name = attrs.name;
    if (attrs.profilePicture !== undefined) updateData.profilePicture = attrs.profilePicture;
    if (attrs.country !== undefined) updateData.country = attrs.country;
    if (attrs.dateOfBirth !== undefined) {
      if (typeof attrs.dateOfBirth === 'string') {
        updateData.dateOfBirth = new Date(attrs.dateOfBirth);
      } else {
        updateData.dateOfBirth = attrs.dateOfBirth;
      }
    }

    // Remove undefined values (phòng trường hợp truyền null)
    type UpdateKeys = keyof Partial<User>;
    Object.keys(updateData as Record<UpdateKeys, unknown>).forEach(
      key =>
        updateData[key as UpdateKeys] === undefined &&
        delete updateData[key as UpdateKeys],
    );

    try {
      const updatedUser = await this.userModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true },
      );

      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      this.logger.log(`User ${id} updated successfully`);
      return updatedUser;
    } catch (error: any) {
      this.logger.error(`Failed to update user ${id}: ${error.message}`);
      throw new BadRequestException('Failed to update user');
    }
  }

  async adminUpdate(id: string, attrs: Partial<User>): Promise<UserDocument> {
    return this.update(id, attrs, true);
  }

  async deleteMany(): Promise<void> {
    try {
      await this.userModel.deleteMany({});
      this.logger.log('All users deleted successfully');
    } catch (error: any) {
      this.logger.error(`Failed to delete users: ${error.message}`);
      throw new BadRequestException('Failed to delete users');
    }
  }

  async generateUsers(count: number): Promise<UserDocument[]> {
    const generatedUsers = await generateUsers(count);
    return this.createMany(generatedUsers);
  }

  async addVoucherToUser(
    userId: string,
    voucherId: string,
    vouchersService: any,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(voucherId)) {
      throw new BadRequestException('ID không hợp lệ');
    }
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }
    // Kiểm tra đã có voucher chưa
    if (user.vouchers && user.vouchers.includes(voucherId)) {
      throw new BadRequestException('User đã có voucher này');
    }
    // Gọi service voucher để thêm user vào voucher
    await vouchersService.addUserToVoucher(voucherId, userId);
    // Thêm voucher vào user
    user.vouchers = user.vouchers || [];
    user.vouchers.push(voucherId);
    await user.save();
    return user;
  }

  async addFavoriteProduct(userId: string, productId: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    // Có thể kiểm tra productId hợp lệ nếu cần
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    if (user.favoriteProducts?.includes(productId)) {
      throw new BadRequestException('Sản phẩm đã có trong danh sách yêu thích');
    }
    user.favoriteProducts = user.favoriteProducts || [];
    user.favoriteProducts.push(productId);
    await user.save();
    return user;
  }

  async removeFavoriteProduct(userId: string, productId: string): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    if (!user.favoriteProducts?.includes(productId)) {
      throw new BadRequestException('Sản phẩm không có trong danh sách yêu thích');
    }
    user.favoriteProducts = user.favoriteProducts.filter(id => id !== productId);
    await user.save();
    return user;
  }

  async isProductFavorited(userId: string, productId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user.favoriteProducts?.includes(productId) || false;
  }

  async getFavoriteProducts(userId: string): Promise<any[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    const ids = user.favoriteProducts || [];
    if (ids.length === 0) return [];
    // Lấy chi tiết sản phẩm
    const products = await Promise.all(ids.map(id => this.productsService.findById(id).catch(() => null)));
    // Lọc ra các sản phẩm hợp lệ
    return products.filter(p => p);
  }

  // Address methods
  async addAddress(
    userId: string,
    addressData: CreateAddressDto,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID user không hợp lệ');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    const newAddress: Address = {
      name:addressData.name,
      phone: addressData.phone,
      address: addressData.address,
    };

    user.addresses = user.addresses || [];
    user.addresses.push(newAddress);
    await user.save();

    this.logger.log(`Address added to user ${userId}`);
    return user;
  }

  async updateAddress(
    userId: string,
    addressIndex: number,
    addressData: UpdateAddressDto,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID user không hợp lệ');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    if (
      !user.addresses ||
      addressIndex < 0 ||
      addressIndex >= user.addresses.length
    ) {
      throw new BadRequestException('Index address không hợp lệ');
    }

    const address = user.addresses[addressIndex];
    if (addressData.phone) address.phone = addressData.phone;
    if (addressData.address) address.address = addressData.address;

    await user.save();

    this.logger.log(`Address ${addressIndex} updated for user ${userId}`);
    return user;
  }

  async updateAddressById(
    userId: string,
    addressId: string,
    addressData: UpdateAddressDto,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID user không hợp lệ');
    }

    if (!Types.ObjectId.isValid(addressId)) {
      throw new BadRequestException('ID address không hợp lệ');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    if (!user.addresses || user.addresses.length === 0) {
      throw new BadRequestException('User không có địa chỉ nào');
    }

    // Tìm address theo _id
    const address = user.addresses.find(
      addr => addr._id?.toString() === addressId,
    );

    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ với ID này');
    }

    // Cập nhật thông tin
    if (addressData.phone) address.phone = addressData.phone;
    if (addressData.address) address.address = addressData.address;

    await user.save();

    this.logger.log(`Address ${addressId} updated for user ${userId}`);
    return user;
  }

  async removeAddress(
    userId: string,
    addressId: string,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID user không hợp lệ');
    }

    if (!Types.ObjectId.isValid(addressId)) {
      throw new BadRequestException('ID address không hợp lệ');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    if (!user.addresses || user.addresses.length === 0) {
      throw new BadRequestException('User không có địa chỉ nào');
    }

    // Tìm và xóa address theo _id
    const addressIndex = user.addresses.findIndex(
      address => address._id?.toString() === addressId,
    );

    if (addressIndex === -1) {
      throw new NotFoundException('Không tìm thấy địa chỉ với ID này');
    }

    user.addresses.splice(addressIndex, 1);
    await user.save();

    this.logger.log(`Address ${addressId} removed from user ${userId}`);
    return user;
  }

  async getAddresses(userId: string): Promise<Address[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('ID user không hợp lệ');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    return user.addresses || [];
  }
}
