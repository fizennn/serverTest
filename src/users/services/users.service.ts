import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { User, UserDocument } from '../schemas/user.schema';
import { hashPassword } from '@/utils/password';
import { generateUsers } from '@/utils/seed-users';
import { PaginatedResponse } from '../../shared/types';
import { MailService } from '@/mail/mail.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private mailService: MailService,
    private jwtService: JwtService,
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
        { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '24h' },
      );

      // Gửi email xác nhận
      await this.mailService.sendActivationEmail(
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

    if (attrs.email) {
      const existingUser = await this.findOne(attrs.email);
      if (existingUser && existingUser._id.toString() !== id) {
        throw new BadRequestException('Email is already in use');
      }
    }

    const updateData: Partial<User> = {
      ...attrs,
      isAdmin: isAdmin ? attrs.isAdmin : undefined,
      password: attrs.password ? await hashPassword(attrs.password) : undefined,
    };

    // Remove undefined values
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
}
