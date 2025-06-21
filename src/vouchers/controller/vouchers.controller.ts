import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VouchersService } from '../services/vouchers.service';
import { CreateVoucherDto, UpdateVoucherDto, VoucherResponseDto, PaginatedVoucherResponseDto } from '../dtos/voucher.dto';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { AdminGuard } from '@/guards/admin.guard';

@ApiTags('Vouchers')
@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tạo voucher mới (Admin only)' })
  @ApiResponse({ status: 201, description: 'Voucher được tạo thành công', type: PaginatedVoucherResponseDto })
  create(@Body() createVoucherDto: CreateVoucherDto) {
    return this.vouchersService.create(createVoucherDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả vouchers' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng voucher trên mỗi trang' })
  @ApiResponse({ status: 200, description: 'Danh sách vouchers đã được phân trang', type: PaginatedVoucherResponseDto })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.vouchersService.findAll(+page, +limit);
  }

  @Get('active')
  @ApiOperation({ summary: 'Lấy danh sách vouchers đang hoạt động' })
  @ApiResponse({ status: 200, description: 'Danh sách vouchers đang hoạt động', type: [VoucherResponseDto] })
  findActive() {
    return this.vouchersService.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin voucher theo ID' })
  @ApiResponse({ status: 200, description: 'Thông tin voucher', type: VoucherResponseDto })
  @ApiResponse({ status: 404, description: 'Voucher không tồn tại' })
  findOne(@Param('id') id: string) {
    return this.vouchersService.findOne(id);
  }

//   @Patch(':id')
//   @UseGuards(JwtAuthGuard, AdminGuard)
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Cập nhật voucher (Admin only)' })
//   @ApiResponse({ status: 200, description: 'Voucher được cập nhật thành công', type: VoucherResponseDto })
//   update(@Param('id') id: string, @Body() updateVoucherDto: UpdateVoucherDto) {
//     return this.vouchersService.update(id, updateVoucherDto);
//   }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vô hiệu hóa voucher (Admin only)' })
  @ApiResponse({ status: 200, description: 'Voucher được vô hiệu hóa thành công' })
  disable(@Param('id') id: string) {
    return this.vouchersService.disable(id);
  }

//   @Post(':id/add-user')
//   @UseGuards(JwtAuthGuard, AdminGuard)
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Thêm user vào voucher (Admin only)' })
//   @ApiResponse({ status: 200, description: 'User được thêm vào voucher thành công', type: VoucherResponseDto })
//   addUserToVoucher(
//     @Param('id') voucherId: string,
//     @Body('userId') userId: string,
//   ) {
//     return this.vouchersService.addUserToVoucher(voucherId, userId);
//   }

//   @Post(':id/remove-user')
//   @UseGuards(JwtAuthGuard, AdminGuard)
//   @ApiBearerAuth()
//   @ApiOperation({ summary: 'Xóa user khỏi voucher (Admin only)' })
//   @ApiResponse({ status: 200, description: 'User được xóa khỏi voucher thành công', type: VoucherResponseDto })
//   removeUserFromVoucher(
//     @Param('id') voucherId: string,
//     @Body('userId') userId: string,
//   ) {
//     return this.vouchersService.removeUserFromVoucher(voucherId, userId);
//   }

  @Post(':id/validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kiểm tra tính hợp lệ của voucher' })
  @ApiResponse({ status: 200, description: 'Kết quả kiểm tra voucher' })
  checkVoucherValidity(
    @Param('id') voucherId: string,
    @Body('userId') userId: string,
    @Body('amount') amount: number,
  ) {
    return this.vouchersService.checkVoucherValidity(voucherId, userId, amount);
  }
} 