import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VoucherRefundService, CreateRefundVoucherDto } from '../services/voucher-refund.service';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { AdminGuard } from '@/guards/admin.guard';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { UserDocument } from '@/users/schemas/user.schema';

@ApiTags('Voucher Hoàn Tiền')
@Controller('voucher-refund')
export class VoucherRefundController {
  constructor(private voucherRefundService: VoucherRefundService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('create')
  @ApiOperation({
    summary: 'Tạo voucher hoàn tiền (Admin only)',
    description: 'Tạo voucher hoàn tiền cho khách hàng với số tiền và thông tin cụ thể',
  })
  @ApiResponse({ status: 201, description: 'Tạo voucher hoàn tiền thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  async createRefundVoucher(@Body() createRefundVoucherDto: CreateRefundVoucherDto) {
    return this.voucherRefundService.createRefundVoucher(createRefundVoucherDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-vouchers')
  @ApiOperation({
    summary: 'Lấy danh sách voucher hoàn tiền của user',
    description: 'Lấy tất cả voucher hoàn tiền hợp lệ của user hiện tại',
  })
  @ApiResponse({ status: 200, description: 'Danh sách voucher hoàn tiền' })
  async getMyRefundVouchers(@CurrentUser() user: UserDocument) {
    return this.voucherRefundService.getUserRefundVouchers(user._id.toString());
  }

  @UseGuards(JwtAuthGuard)
  @Get('validate/:voucherId')
  @ApiOperation({
    summary: 'Kiểm tra voucher có hợp lệ không',
    description: 'Kiểm tra voucher có thể sử dụng cho đơn hàng với giá trị cụ thể',
  })
  @ApiParam({ name: 'voucherId', description: 'ID của voucher' })
  @ApiQuery({ name: 'orderAmount', description: 'Giá trị đơn hàng', example: '500000' })
  @ApiResponse({ status: 200, description: 'Kết quả kiểm tra voucher' })
  async validateVoucher(
    @Param('voucherId') voucherId: string,
    @Query('orderAmount') orderAmount: string,
    @CurrentUser() user: UserDocument,
  ) {
    const amount = parseInt(orderAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException('Giá trị đơn hàng không hợp lệ');
    }

    return this.voucherRefundService.validateVoucherForUser(
      voucherId,
      user._id.toString(),
      amount,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('use/:voucherId')
  @ApiOperation({
    summary: 'Sử dụng voucher (giảm stock)',
    description: 'Đánh dấu voucher đã được sử dụng',
  })
  @ApiParam({ name: 'voucherId', description: 'ID của voucher' })
  @ApiResponse({ status: 200, description: 'Sử dụng voucher thành công' })
  @ApiResponse({ status: 400, description: 'Voucher không hợp lệ hoặc đã hết' })
  async useVoucher(@Param('voucherId') voucherId: string) {
    await this.voucherRefundService.useVoucher(voucherId);
    return { message: 'Voucher đã được sử dụng thành công' };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('user/:userId')
  @ApiOperation({
    summary: 'Lấy voucher hoàn tiền của user cụ thể (Admin only)',
    description: 'Lấy tất cả voucher hoàn tiền của user được chỉ định',
  })
  @ApiParam({ name: 'userId', description: 'ID của user' })
  @ApiResponse({ status: 200, description: 'Danh sách voucher hoàn tiền của user' })
  async getUserRefundVouchers(@Param('userId') userId: string) {
    return this.voucherRefundService.getUserRefundVouchers(userId);
  }
}
