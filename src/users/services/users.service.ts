import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User, UserDocument, Address } from '../schemas/user.schema';
import { Role, RoleDocument } from '../schemas/role.schema';
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
    @InjectModel(Role.name) private roleModel: Model<Role>,
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
  async updatePass(id: string, pass: string) {
    return await this.userModel.findByIdAndUpdate(id, {
      password: pass,
    });
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
    if (attrs.profilePicture !== undefined)
      updateData.profilePicture = attrs.profilePicture;
    if (attrs.country !== undefined) updateData.country = attrs.country;
    if (attrs.dateOfBirth !== undefined) {
      if (typeof attrs.dateOfBirth === 'string') {
        updateData.dateOfBirth = new Date(attrs.dateOfBirth);
      } else {
        updateData.dateOfBirth = attrs.dateOfBirth;
      }
    }

    // Thêm các trường mới cho admin update
    if (isAdmin) {
      if (attrs.isActive !== undefined) updateData.isActive = attrs.isActive;
      if (attrs.isAdmin !== undefined) updateData.isAdmin = attrs.isAdmin;
      if (attrs.roleId !== undefined) {
        // Validate roleId nếu được cung cấp
        if (attrs.roleId && !Types.ObjectId.isValid(attrs.roleId)) {
          throw new BadRequestException('Invalid role ID');
        }

        // Kiểm tra role có tồn tại không (nếu roleId được cung cấp)
        if (attrs.roleId) {
          const role = await this.roleModel.findById(attrs.roleId);
          if (!role) {
            throw new NotFoundException('Không tìm thấy role');
          }
        }

        updateData.roleId = attrs.roleId;
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
      const updatedUser = await this.userModel
        .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
        .populate({
          path: 'roleId',
          select:
            'name description isOrder isProduct isCategory isPost isVoucher isBanner isAnalytic isReturn isUser isRole isActive priority createdAt updatedAt',
        });

      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return updatedUser;
    } catch (error: any) {
      throw new BadRequestException('Failed to update user');
    }
  }

  async adminUpdate(id: string, attrs: Partial<User>): Promise<UserDocument> {
    return this.update(id, attrs, true);
  }

  async deleteMany(): Promise<void> {
    try {
      await this.userModel.deleteMany({});
    } catch (error: any) {
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

  async removeVoucherFromUser(
    userId: string,
    voucherId: string,
    vouchersService: any,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(voucherId)) {
      throw new BadRequestException('ID không hợp lệ');
    }

    // Tìm và cập nhật user bằng $pull để xóa voucher khỏi mảng
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { $pull: { vouchers: voucherId } }, // Sử dụng $pull để xóa voucherId khỏi mảng vouchers
      { new: true }, // Trả về document đã được cập nhật
    );

    if (!user) {
      throw new NotFoundException('Không tìm thấy user');
    }

    // Thử xóa user khỏi voucher (có thể user đã bị xóa khỏi voucher rồi)
    try {
      await vouchersService.removeUserFromVoucher(voucherId, userId);
    } catch (error) {
      // Log lỗi nhưng không dừng lại, vì mục tiêu chính là xóa voucher khỏi user
      console.warn(
        `Could not remove user from voucher ${voucherId} in voucher collection: ${error.message}`,
      );
    }

    return user;
  }

  async addFavoriteProduct(
    userId: string,
    productId: string,
  ): Promise<UserDocument> {
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

  async removeFavoriteProduct(
    userId: string,
    productId: string,
  ): Promise<UserDocument> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    if (!user.favoriteProducts?.includes(productId)) {
      throw new BadRequestException(
        'Sản phẩm không có trong danh sách yêu thích',
      );
    }
    user.favoriteProducts = user.favoriteProducts.filter(
      id => id !== productId,
    );
    await user.save();
    return user;
  }

  async isProductFavorited(
    userId: string,
    productId: string,
  ): Promise<boolean> {
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
    const products = await Promise.all(
      ids.map(id => this.productsService.findById(id).catch(() => null)),
    );
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
      name: addressData.name,
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

  async findAllAdmins(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<UserDocument>> {
    const skip = (page - 1) * limit;

    const [admins, total] = await Promise.all([
      this.userModel
        .find({ isAdmin: true })
        .populate({
          path: 'roleId',
          select:
            'name description isOrder isProduct isCategory isPost isVoucher isBanner isAnalytic isReturn isUser isRole isActive priority createdAt updatedAt',
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments({ isAdmin: true }),
    ]);

    return {
      items: admins,
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  async findAllByPermission(
    permission: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<UserDocument>> {
    try {
      const skip = (page - 1) * limit;

      const matchStage: any = { isAdmin: true };
      matchStage[`roleId.${permission}`] = true;

      const [users, total] = await Promise.all([
        this.userModel
          .find(matchStage)
          .populate({
            path: 'roleId',
            select:
              'name description isOrder isProduct isCategory isPost isVoucher isBanner isAnalytic isReturn isUser isRole isActive priority createdAt updatedAt',
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.userModel.countDocuments(matchStage),
      ]);

      return {
        items: users,
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new BadRequestException('Failed to find users by permission');
    }
  }

  async updatePermissions(
    userId: string,
    permissions: {
      isOrder?: boolean;
      isProduct?: boolean;
      isCategory?: boolean;
      isPost?: boolean;
      isVoucher?: boolean;
      isBanner?: boolean;
      isAnalytic?: boolean;
      isReturn?: boolean;
      isUser?: boolean;
    },
  ): Promise<UserDocument> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('ID user không hợp lệ');
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Không tìm thấy user');
      }

      if (!user.roleId) {
        throw new BadRequestException('User chưa được gán vai trò');
      }

      // Cập nhật quyền trong role
      const RoleModel = this.userModel.db.model('Role');
      await RoleModel.findByIdAndUpdate(user.roleId, { $set: permissions });

      this.logger.log(`Permissions updated for user ${userId}`);
      return user;
    } catch (error) {
      this.logger.error(`Failed to update permissions: ${error.message}`);
      throw new BadRequestException('Failed to update permissions');
    }
  }

  async getPermissions(userId: string): Promise<any> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('ID user không hợp lệ');
      }

      const user = await this.userModel.findById(userId).populate('roleId');
      if (!user) {
        throw new NotFoundException('Không tìm thấy user');
      }

      if (!user.roleId) {
        return {
          isOrder: false,
          isProduct: false,
          isCategory: false,
          isPost: false,
          isVoucher: false,
          isBanner: false,
          isAnalytic: false,
          isReturn: false,
          isUser: false,
        };
      }

      const role = user.roleId as any;
      return {
        isOrder: role.isOrder || false,
        isProduct: role.isProduct || false,
        isCategory: role.isCategory || false,
        isPost: role.isPost || false,
        isVoucher: role.isVoucher || false,
        isBanner: role.isBanner || false,
        isAnalytic: role.isAnalytic || false,
        isReturn: role.isReturn || false,
        isUser: role.isUser || false,
      };
    } catch (error) {
      throw new BadRequestException('Failed to get permissions');
    }
  }

  async assignRole(userId: string, roleId: string): Promise<UserDocument> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('ID user không hợp lệ');
      }

      if (!Types.ObjectId.isValid(roleId)) {
        throw new BadRequestException('ID role không hợp lệ');
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Không tìm thấy user');
      }

      // Kiểm tra role có tồn tại không
      const role = await this.roleModel.findById(roleId);
      if (!role) {
        throw new NotFoundException('Không tìm thấy role');
      }

      user.roleId = roleId;
      await user.save();

      // Populate roleId để trả về thông tin đầy đủ
      const updatedUser = await this.userModel.findById(userId).populate({
        path: 'roleId',
        select:
          'name description isOrder isProduct isCategory isPost isVoucher isBanner isAnalytic isReturn isUser isRole isActive priority createdAt updatedAt',
      });

      return updatedUser;
    } catch (error) {
      throw new BadRequestException('Failed to assign role');
    }
  }

  async removeRole(userId: string): Promise<UserDocument> {
    try {
      if (!Types.ObjectId.isValid(userId)) {
        throw new BadRequestException('ID user không hợp lệ');
      }

      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new NotFoundException('Không tìm thấy user');
      }

      user.roleId = null;
      await user.save();

      return user;
    } catch (error) {
      throw new BadRequestException('Failed to remove role');
    }
  }

  async findAllByRole(
    roleId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponse<UserDocument>> {
    try {
      if (!Types.ObjectId.isValid(roleId)) {
        throw new BadRequestException('ID role không hợp lệ');
      }

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        this.userModel
          .find({ roleId, isAdmin: true })
          .populate({
            path: 'roleId',
            select:
              'name description isOrder isProduct isCategory isPost isVoucher isBanner isAnalytic isReturn isUser isRole isActive priority createdAt updatedAt',
          })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.userModel.countDocuments({ roleId, isAdmin: true }),
      ]);

      return {
        items: users,
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw new BadRequestException('Failed to find users by role');
    }
  }

  async getEmployeeStatistics() {
    try {
      // Lấy tổng số nhân viên
      const totalEmployees = await this.userModel.countDocuments({
        isAdmin: true,
      });

      // Lấy nhân viên theo role
      const employeesByRole = await this.userModel.aggregate([
        { $match: { isAdmin: true } },
        {
          $lookup: {
            from: 'roles',
            localField: 'roleId',
            foreignField: '_id',
            as: 'role',
          },
        },
        {
          $unwind: '$role',
        },
        {
          $group: {
            _id: '$roleId',
            count: { $sum: 1 },
            roleName: { $first: '$role.name' },
          },
        },
        { $sort: { count: -1 } },
      ]);

      // Lấy thống kê theo quyền
      const employeesByPermission = await this.userModel.aggregate([
        { $match: { isAdmin: true } },
        {
          $lookup: {
            from: 'roles',
            localField: 'roleId',
            foreignField: '_id',
            as: 'role',
          },
        },
        {
          $unwind: '$role',
        },
        {
          $group: {
            _id: null,
            isOrder: { $sum: { $cond: ['$role.isOrder', 1, 0] } },
            isProduct: { $sum: { $cond: ['$role.isProduct', 1, 0] } },
            isCategory: { $sum: { $cond: ['$role.isCategory', 1, 0] } },
            isPost: { $sum: { $cond: ['$role.isPost', 1, 0] } },
            isVoucher: { $sum: { $cond: ['$role.isVoucher', 1, 0] } },
            isBanner: { $sum: { $cond: ['$role.isBanner', 1, 0] } },
            isAnalytic: { $sum: { $cond: ['$role.isAnalytic', 1, 0] } },
            isReturn: { $sum: { $cond: ['$role.isReturn', 1, 0] } },
            isUser: { $sum: { $cond: ['$role.isUser', 1, 0] } },
          },
        },
      ]);

      // Lấy nhân viên gần đây
      const recentEmployees = await this.userModel
        .find({ isAdmin: true })
        .populate({
          path: 'roleId',
          select: 'name description',
        })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('name email isActive createdAt roleId')
        .exec();

      return {
        totalEmployees,
        employeesByRole,
        employeesByPermission: employeesByPermission[0] || {
          isOrder: 0,
          isProduct: 0,
          isCategory: 0,
          isPost: 0,
          isVoucher: 0,
          isBanner: 0,
          isAnalytic: 0,
          isReturn: 0,
          isUser: 0,
        },
        recentEmployees,
      };
    } catch (error) {
      this.logger.error(`Failed to get employee statistics: ${error.message}`);
      throw new BadRequestException('Failed to get employee statistics');
    }
  }

  async getEmployeeActivityStatistics(dateRange?: {
    startDate: string;
    endDate: string;
  }) {
    try {
      const matchStage: any = { isAdmin: true };

      if (dateRange?.startDate && dateRange?.endDate) {
        matchStage.lastLogin = {
          $gte: new Date(dateRange.startDate),
          $lte: new Date(dateRange.endDate),
        };
      }

      // Tổng số lần đăng nhập
      const totalLogins = await this.userModel.countDocuments({
        ...matchStage,
        lastLogin: { $exists: true, $ne: null },
      });

      // Người dùng hoạt động (đăng nhập trong 30 ngày qua)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeUsers = await this.userModel.countDocuments({
        isAdmin: true,
        lastLogin: { $gte: thirtyDaysAgo },
      });

      // Người dùng không hoạt động
      const inactiveUsers = await this.userModel.countDocuments({
        isAdmin: true,
        $or: [
          { lastLogin: { $lt: thirtyDaysAgo } },
          { lastLogin: { $exists: false } },
          { lastLogin: null },
        ],
      });

      // Xu hướng đăng nhập theo ngày
      const loginTrends = await this.userModel.aggregate([
        { $match: { isAdmin: true, lastLogin: { $exists: true, $ne: null } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$lastLogin',
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 30 },
      ]);

      return {
        totalLogins,
        activeUsers,
        inactiveUsers,
        loginTrends,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get employee activity statistics: ${error.message}`,
      );
      throw new BadRequestException(
        'Failed to get employee activity statistics',
      );
    }
  }
}
