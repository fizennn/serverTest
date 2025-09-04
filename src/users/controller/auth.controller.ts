import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LocalAuthGuard } from 'src/guards/local-auth.guard';
import { Serialize } from 'src/interceptors/serialize.interceptor';
import { ProfileDto } from '../dtos/profile.dto';
import { RegisterDto } from '../dtos/register.dto';
import { UserDto } from '../dtos/user.dto';
import { ChangePasswordDto } from '../dtos/ChangePasswordDto';
import { UserDocument } from '../schemas/user.schema';
import { AuthService } from '../services/auth.service';
import { UsersService } from '../services/users.service';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthResponseDto, LoginDto } from '../dtos/auth.dto';
import { NotAuthenticatedGuard } from '@/guards/not-authenticated.guard';
import { RefreshTokenDto } from '../dtos/refreshtoken.dto';
import { JwtService } from '@nestjs/jwt';
import { hashPassword } from '@/utils/password';
import { use } from 'passport';
import { log } from 'console';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @ApiOperation({
    summary: 'Đăng nhập với email và password',
    description:
      'Sao chép "accessToken" từ response và nhập vào Swagger Authorize (Bearer <token>). Response bao gồm thông tin user và danh sách tất cả voucher mà user có quyền sử dụng (bao gồm cả voucher bị disable).',
  })
  @ApiResponse({
    status: 200,
    description:
      'Đăng nhập thành công trả ra token và thông tin user bao gồm voucher',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Email hoặc password không đúng',
  })
  @ApiResponse({
    status: 400,
    description: 'Tài khoản chưa được kích hoạt',
  })
  @ApiBody({ type: LoginDto })
  @UseGuards(NotAuthenticatedGuard, LocalAuthGuard)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user.isActive) {
      throw new UnauthorizedException({
        message: 'Tài khoản chưa được kích hoạt',
        user: undefined,
      });
    }
    if (loginDto?.deviceId) {
      user.deviceId = loginDto?.deviceId;
      await user.save();
    }
    const { tokens, user: userData } = await this.authService.login(user);
    console.log('devicdeId', user.deviceId);
    return { user: userData, tokens };
  }

  // @Serialize(UserDto) // Tạm thời bỏ serialize để debug
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Lấy thông tin hồ sơ người dùng',
    description:
      'Yêu cầu Bearer token. Nhập token từ /auth/login vào Authorize.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trả về thông tin hồ sơ người dùng',
    type: UserDto,
  })
  @ApiBearerAuth('JWT-auth')
  @Get('profile')
  getProfile(@CurrentUser() user: UserDocument) {
    // Debug: Log user trước khi trả về
    console.log('🔍 [PROFILE_API] User before return:', {
      id: user._id,
      email: user.email,
      vouchers: user.vouchers,
      vouchersLength: user.vouchers?.length || 0,
      vouchersType: typeof user.vouchers,
      isArray: Array.isArray(user.vouchers)
    });
    
    return user;
  }

  @ApiOperation({
    summary: 'Làm mới token',
    description: 'Gửi refreshToken từ /auth/login để nhận token mới.',
  })
  @ApiResponse({
    status: 200,
    description: 'Làm mới token thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        tokens: {
          type: 'object',
          properties: {
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token không hợp lệ',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: RefreshTokenDto })
  @Post('refresh')
  async refresh(@Body() { refreshToken }: RefreshTokenDto) {
    if (!refreshToken) {
      throw new BadRequestException('Chưa gửi RF token');
    }
    const tokens = await this.authService.refresh(refreshToken);
    return { success: true, tokens };
  }

  @ApiOperation({
    summary: 'Đăng xuất',
    description: 'Yêu cầu Bearer token. Xóa refresh token của người dùng.',
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng xuất thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('logout')
  async logout(@CurrentUser() user: UserDocument) {
    await this.authService.logout(user._id.toString());
    return { success: true };
  }

  @ApiOperation({
    summary: 'Đăng ký',
    description: 'Vui lòng kiểm tra email để kích hoạt tài khoản.',
  })
  @ApiResponse({
    status: 201,
    description: 'Đăng ký thành công',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiBody({ type: RegisterDto })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.usersService.create(registerDto);
    return { user, message: 'Vui lòng kiểm tra email để kích hoạt tài khoản' };
  }

  @ApiOperation({
    summary: 'Cập nhật hồ sơ người dùng',
    description:
      'Yêu cầu Bearer token. Chỉ cho phép cập nhật các trường: name, profilePicture, country, dateOfBirth. Nhập token từ /auth/login vào Authorize.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật hồ sơ thành công',
    type: UserDto,
  })
  @ApiBody({
    type: ProfileDto,
    examples: {
      default: {
        summary: 'Ví dụ cập nhật profile',
        value: {
          name: 'Nguyen Van A',
          profilePicture: 'https://example.com/avatar.jpg',
          country: 'Vietnam',
          dateOfBirth: '01-01-1990',
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Put('profile')
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() updateDto: ProfileDto,
  ) {
    // Chuyển dateOfBirth sang Date nếu có
    const updateData: any = { ...updateDto };
    if (updateData.dateOfBirth) {
      // Hỗ trợ định dạng dd-mm-yyyy
      if (/^\d{2}-\d{2}-\d{4}$/.test(updateData.dateOfBirth)) {
        const [day, month, year] = updateData.dateOfBirth.split('-');
        updateData.dateOfBirth = new Date(`${year}-${month}-${day}`);
      } else {
        updateData.dateOfBirth = new Date(updateData.dateOfBirth);
      }
    }
    return this.usersService.update(user._id.toString(), updateData);
  }

  @ApiOperation({
    summary: 'Kích hoạt tài khoản',
    description: 'Kích hoạt tài khoản bằng link trong email xác nhận.',
  })
  @ApiQuery({
    name: 'userId',
    required: true,
    description: 'ID của người dùng',
  })
  @ApiQuery({ name: 'token', required: true, description: 'Token kích hoạt' })
  @ApiResponse({
    status: 200,
    description: 'Kích hoạt tài khoản thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'UserId hoặc token không hợp lệ',
  })
  @Get('activate')
  async activateAccount(
    @Query('userId') userId: string,
    @Query('token') token: string,
  ) {
    if (!userId || !token) {
      throw new BadRequestException('UserId và token là bắt buộc');
    }

    try {
      const jwtSecret = this.configService.get<string>('JWT_ACCESS_SECRET');

      const payload = await this.jwtService.verifyAsync(token, {
        secret: jwtSecret,
      });

      if (payload.sub !== userId) {
        throw new BadRequestException('Token không hợp lệ - User ID mismatch');
      }

      if (payload.type !== 'activation') {
        throw new BadRequestException('Token không hợp lệ - Wrong token type');
      }

      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new BadRequestException('Người dùng không tồn tại');
      }

      if (user.isActive) {
        return { success: true, message: 'Tài khoản đã được kích hoạt' };
      }

      // Sử dụng method riêng cho việc kích hoạt tài khoản
      await this.usersService.activateAccount(userId);
      return { success: true, message: 'Kích hoạt tài khoản thành công' };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  @ApiOperation({
    summary: 'Quên mật khẩu',
    description: 'Gửi email chứa mật khẩu mới đến email người dùng.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email đặt lại mật khẩu đã được gửi',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Email không tồn tại',
  })
  @ApiBody({
    schema: { type: 'object', properties: { email: { type: 'string' } } },
  })
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email là bắt buộc');
    }

    await this.usersService.resetPassword(email);
    return { success: true, message: 'Email đặt lại mật khẩu đã được gửi' };
  }

  @ApiOperation({
    summary: 'Đổi mật khẩu',
    description:
      'Yêu cầu Bearer token. Đổi mật khẩu người dùng đang đăng nhập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Đổi mật khẩu thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Mật khẩu cũ không đúng hoặc dữ liệu không hợp lệ',
  })
  @ApiBody({ type: ChangePasswordDto })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: UserDocument,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const { oldPassword, newPassword } = changePasswordDto;
    console.log({ oldPassword, newPassword });
    if (!newPassword || !oldPassword) {
      throw new BadRequestException({
        messsage: 'Vui lòng điền đủ thông tin',
      });
    }
    // Xác minh mật khẩu cũ
    const isValid = await this.authService.validateUser(
      user.email,
      oldPassword,
    );
    if (!isValid) {
      throw new BadRequestException('Mật khẩu cũ không đúng');
    }
    console.log(user._id.toString());
    // Băm và cập nhật mật khẩu mới
    const newpasss = await hashPassword(newPassword);
    await this.usersService.updatePass(user._id.toString(), newpasss);

    return { success: true, message: 'Đổi mật khẩu thành công' };
  }
}
