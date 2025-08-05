import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtService } from '@nestjs/jwt';
import { AuthResponseDto, TokensDto, TokenPayload } from '../dtos/auth.dto';
import { User, UserDocument } from '../schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { verifyPassword, hashPassword } from '@/utils/password';
import { randomUUID } from 'crypto';
import { VouchersService } from '../../vouchers/services/vouchers.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<User>,
    private vouchersService: VouchersService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserDocument> {
    const user = await this.usersService.findOne(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await verifyPassword(user.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(user: UserDocument): Promise<AuthResponseDto> {
    // Populate role trước khi tạo tokens
    const userWithRole = await this.userModel
      .findById(user._id)
      .populate('roleId');
    if (user.deviceId) {
      await this.userModel.findByIdAndUpdate(user._id, {
        deviceId: user.deviceId,
      });
    }
    const tokens = await this.generateTokens(userWithRole);

    // Populate vouchers data - lấy tất cả voucher mà user có quyền sử dụng
    let userVouchers = [];
    try {
      // Lấy tất cả voucher mà user có quyền sử dụng (user ID có trong userId array của voucher)
      const vouchers = await this.vouchersService.findVouchersByUserId(
        user._id.toString(),
      );
      userVouchers = vouchers; // Không filter isDisable nữa, lấy tất cả voucher của user

      console.log(
        `Successfully fetched ${userVouchers.length} vouchers for user ${user.email}`,
      );
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      userVouchers = []; // Đảm bảo trả về array rỗng nếu có lỗi
    }

    return {
      tokens,
      user: {
        id: userWithRole._id.toString(),
        email: userWithRole.email,
        name: userWithRole.name,
        isAdmin: userWithRole.isAdmin,
        profilePicture: userWithRole.profilePicture || '',
        isActive: userWithRole.isActive,
        loyaltyPoints: userWithRole.loyaltyPoints,
        phoneNumber: userWithRole.phoneNumber,
        address: userWithRole.address,
        addresses: userWithRole.addresses,
        city: userWithRole.city,
        country: userWithRole.country,
        postalCode: userWithRole.postalCode,
        dateOfBirth: userWithRole.dateOfBirth,
        lastLogin: userWithRole.lastLogin,
        createdAt: userWithRole.createdAt,
        vouchers: userVouchers,
        roleId: userWithRole.roleId,
      },
    };
  }

  private async generateTokens(user: UserDocument): Promise<TokensDto> {
    const jti = randomUUID();

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          isAdmin: user.isAdmin,
          type: 'access',
        } as TokenPayload,
        {
          expiresIn: '10y',
          secret: process.env.JWT_ACCESS_SECRET,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          isAdmin: user.isAdmin,
          type: 'refresh',
          jti,
        } as TokenPayload,
        {
          expiresIn: '10y',
          secret: process.env.JWT_REFRESH_SECRET,
        },
      ),
    ]);

    await this.userModel.findByIdAndUpdate(user._id, {
      refreshToken: jti,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken: string): Promise<TokensDto> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        refreshToken,
        {
          secret: process.env.JWT_REFRESH_SECRET,
        },
      );

      if (payload.type !== 'refresh' || !payload.jti) {
        throw new UnauthorizedException();
      }

      const user = await this.userModel.findById(payload.sub);
      if (!user || !user.refreshToken) {
        throw new UnauthorizedException();
      }

      if (user.refreshToken !== payload.jti) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException();
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: null,
    });
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await verifyPassword(user.password, oldPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid old password');
    }

    const hashedPassword = await hashPassword(newPassword);
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findOne(email);
    if (!user) {
      return; // Silently return to prevent email enumeration
    }

    // TODO: Implement email sending logic for password reset
    // Generate reset token, save to user, and send email
  }
}
