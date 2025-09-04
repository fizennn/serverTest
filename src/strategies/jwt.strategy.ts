import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from 'src/users/services/users.service';
import { TokenPayload } from '../users/dtos/auth.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: TokenPayload) {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Lấy user với đầy đủ thông tin, bao gồm vouchers được populate
    const user = await this.userModel.findById(payload.sub)
      .populate('roleId')
      .populate('vouchers') // Populate thông tin voucher
      .lean();
    
    if (!user) {
      throw new UnauthorizedException();
    }

    // Debug: Log thông tin user để kiểm tra
    console.log('🔍 [JWT_STRATEGY] User found:', {
      id: user._id,
      email: user.email,
      vouchers: user.vouchers,
      vouchersLength: user.vouchers?.length || 0,
      voucherDetails: user.vouchers?.map(v => {
        if (typeof v === 'string') {
          return { id: v, name: 'String ID', discount: 'N/A' };
        }
        return {
          id: (v as any)._id,
          name: (v as any).name,
          discount: (v as any).discount
        };
      })
    });

    // Đảm bảo field vouchers được giữ nguyên
    if (!user.vouchers) {
      user.vouchers = [];
      console.log('⚠️ [JWT_STRATEGY] Vouchers field was missing, set to empty array');
    }

    return user;
  }
}