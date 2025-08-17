import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  Query,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VouchersService } from '../services/vouchers.service';
import { CreateVoucherDto, UpdateVoucherDto, VoucherResponseDto, PaginatedVoucherResponseDto, CheckVoucherDto, CalculateMultipleVouchersDto, VoucherSearchDto, BulkUpdateVoucherDto } from '../dtos/voucher.dto';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { AdminGuard } from '@/guards/admin.guard';
import { UsersService } from '@/users/services/users.service';

@ApiTags('Voucher - Hệ thống giảm giá')
@Controller('vouchers')
export class VouchersController {
  constructor(
    private readonly vouchersService: VouchersService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Tạo voucher mới',
    description: 'Tạo voucher với 2 loại: item (giảm giá sản phẩm) và ship (giảm giá vận chuyển). Mỗi voucher có điều kiện tối thiểu và giới hạn giảm giá riêng.'
  })
  @ApiResponse({ status: 201, description: 'Voucher được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  create(@Body() createVoucherDto: CreateVoucherDto) {
    return this.vouchersService.create(createVoucherDto);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Tìm kiếm voucher nâng cao',
    description: 'Tìm kiếm voucher với nhiều tiêu chí: từ khóa, loại, thời gian, giá trị, stock, user, sắp xếp...'
  })
  @ApiResponse({ status: 200, description: 'Danh sách voucher', type: PaginatedVoucherResponseDto })
  findAll(@Query() searchDto: VoucherSearchDto) {
    return this.vouchersService.findManyAdvanced(searchDto);
  }

  @Get('active')
  @ApiOperation({ 
    summary: 'Lấy danh sách voucher đang hoạt động',
    description: 'Lấy danh sách voucher đang trong thời gian hiệu lực, có stock và chưa bị vô hiệu hóa. Bao gồm cả item và ship voucher.'
  })
  @ApiResponse({ status: 200, description: 'Danh sách voucher đang hoạt động' })
  findActive() {
    return this.vouchersService.findActive();
  }

  @Get('all')
  @ApiOperation({ 
    summary: 'Lấy tất cả voucher (debug)',
    description: 'Lấy tất cả voucher trong database để debug. Endpoint này hiển thị tất cả voucher bất kể trạng thái (active, disabled, expired).'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tất cả voucher trong database',
    type: [VoucherResponseDto]
  })
  findAllVouchers() {
    return this.vouchersService.findAllVouchers();
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Lấy danh sách voucher của user',
    description: 'Lấy tất cả voucher mà user có quyền sử dụng (user ID có trong danh sách userId của voucher). Bao gồm cả voucher bị disable.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Danh sách voucher của user',
    type: [VoucherResponseDto]
  })
  @ApiResponse({ 
    status: 400, 
    description: 'User ID không hợp lệ' 
  })
  findVouchersByUserId(@Param('userId') userId: string) {
    return this.vouchersService.findVouchersByUserId(userId);
  }

  @Delete('user/:userId/voucher/:voucherId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Xóa voucher khỏi user',
    description: 'Xóa quyền sử dụng voucher của user. Voucher sẽ được trả lại stock và user không thể sử dụng voucher này nữa.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Xóa voucher khỏi user thành công',
    type: VoucherResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Voucher ID hoặc User ID không hợp lệ, hoặc user không có quyền sử dụng voucher này' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Voucher không tồn tại' 
  })
  removeVoucherFromUser(
    @Param('userId') userId: string,
    @Param('voucherId') voucherId: string
  ) {
    return this.vouchersService.removeVoucherFromUser(voucherId, userId);
  }

  @Delete('user/:userId/remove-voucher/:voucherId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'User tự xóa voucher khỏi danh sách voucher của mình',
    description: 'User tự xóa voucher đã nhận khỏi danh sách voucher của mình. Voucher sẽ được trả lại stock và user không thể sử dụng voucher này nữa.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Xóa voucher khỏi user thành công',
    type: VoucherResponseDto
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Voucher ID hoặc User ID không hợp lệ, hoặc user không có quyền sử dụng voucher này' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Voucher không tồn tại' 
  })
  userRemoveVoucher(
    @Param('userId') userId: string,
    @Param('voucherId') voucherId: string
  ) {
    // Sử dụng users service để xóa voucher khỏi user
    return this.usersService.removeVoucherFromUser(userId, voucherId, this.vouchersService);
  }

  @Get(':id/detail')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Lấy thông tin chi tiết voucher (Admin only)',
    description: 'Lấy thông tin chi tiết của voucher bao gồm danh sách user và thống kê sử dụng'
  })
  @ApiResponse({ status: 200, description: 'Thông tin chi tiết voucher' })
  @ApiResponse({ status: 404, description: 'Voucher không tồn tại' })
  async getVoucherDetail(@Param('id') id: string) {
    return this.vouchersService.getVoucherDetail(id);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Lấy thông tin voucher theo ID',
    description: 'Lấy thông tin chi tiết của voucher bao gồm danh sách user có quyền sử dụng'
  })
  @ApiResponse({ status: 200, description: 'Thông tin voucher', type: VoucherResponseDto })
  @ApiResponse({ status: 404, description: 'Voucher không tồn tại' })
  findOne(@Param('id') id: string) {
    return this.vouchersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Cập nhật voucher (Admin only) - PATCH',
    description: 'Cập nhật thông tin voucher. Chỉ admin mới có quyền cập nhật voucher.'
  })
  @ApiResponse({ status: 200, description: 'Voucher được cập nhật thành công', type: VoucherResponseDto })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Voucher không tồn tại' })
  update(@Param('id') id: string, @Body() updateVoucherDto: UpdateVoucherDto) {
    return this.vouchersService.update(id, updateVoucherDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Cập nhật voucher (Admin only) - PUT',
    description: 'Cập nhật thông tin voucher. Chỉ admin mới có quyền cập nhật voucher. (Tương thích với PUT method)'
  })
  @ApiResponse({ status: 200, description: 'Voucher được cập nhật thành công', type: VoucherResponseDto })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Voucher không tồn tại' })
  updatePut(@Param('id') id: string, @Body() updateVoucherDto: UpdateVoucherDto) {
    return this.vouchersService.update(id, updateVoucherDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vô hiệu hóa voucher (Admin only)' })
  @ApiResponse({ status: 200, description: 'Voucher được vô hiệu hóa thành công' })
  disable(@Param('id') id: string) {
    return this.vouchersService.disable(id);
  }

  @Patch(':id/enable')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Kích hoạt voucher (Admin only)',
    description: 'Kích hoạt lại voucher đã bị vô hiệu hóa. Voucher sẽ có thể được sử dụng lại.'
  })
  @ApiResponse({ status: 200, description: 'Voucher được kích hoạt thành công', type: VoucherResponseDto })
  @ApiResponse({ status: 404, description: 'Voucher không tồn tại' })
  enable(@Param('id') id: string) {
    return this.vouchersService.enable(id);
  }

  @Post(':id/add-user')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Thêm user vào voucher (Admin only)',
    description: 'Thêm quyền sử dụng voucher cho user. Voucher sẽ được giảm stock và user có thể sử dụng voucher này.'
  })
  @ApiResponse({ status: 200, description: 'User được thêm vào voucher thành công', type: VoucherResponseDto })
  @ApiResponse({ status: 400, description: 'User ID không hợp lệ hoặc user đã có quyền sử dụng voucher' })
  @ApiResponse({ status: 404, description: 'Voucher không tồn tại' })
  addUserToVoucher(
    @Param('id') voucherId: string,
    @Body('userId') userId: string,
  ) {
    return this.vouchersService.addUserToVoucher(voucherId, userId);
  }

  @Post(':id/remove-user')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Xóa user khỏi voucher (Admin only)',
    description: 'Xóa quyền sử dụng voucher của user. Voucher sẽ được trả lại stock và user không thể sử dụng voucher này nữa.'
  })
  @ApiResponse({ status: 200, description: 'User được xóa khỏi voucher thành công', type: VoucherResponseDto })
  @ApiResponse({ status: 400, description: 'User ID không hợp lệ hoặc user không có quyền sử dụng voucher' })
  @ApiResponse({ status: 404, description: 'Voucher không tồn tại' })
  removeUserFromVoucher(
    @Param('id') voucherId: string,
    @Body('userId') userId: string,
  ) {
    return this.vouchersService.removeUserFromVoucher(voucherId, userId);
  }

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

  @Post(':id/check')
  @ApiOperation({ 
    summary: 'Kiểm tra và tính toán voucher discount',
    description: 'Kiểm tra tính hợp lệ của voucher và tính toán discount theo type (item/ship). Trả về thông tin chi tiết về discount có thể áp dụng.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Voucher được kiểm tra thành công',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', example: true },
        itemDiscount: { type: 'number', example: 50000, description: 'Giảm giá cho sản phẩm' },
        shipDiscount: { type: 'number', example: 0, description: 'Giảm giá cho vận chuyển' },
        message: { type: 'string', example: 'Voucher hợp lệ' },
        voucher: { 
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            type: { type: 'string', example: 'item', enum: ['item', 'ship'] },
            disCount: { type: 'number', example: 10 },
            condition: { type: 'number', example: 500000 },
            limit: { type: 'number', example: 100000 }
          }
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Voucher không hợp lệ' })
  async checkVoucher(
    @Param('id') id: string,
    @Body() checkVoucherDto: CheckVoucherDto
  ) {
    const { userId, subtotal, shipCost } = checkVoucherDto;
    return await this.vouchersService.calculateVoucherDiscount(
      id,
      userId,
      subtotal,
      shipCost
    );
  }

  @Post('duplicate/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Sao chép voucher (Admin only)',
    description: 'Tạo một voucher mới dựa trên voucher hiện có. Voucher mới sẽ có cùng thông tin nhưng ID khác và có thể được chỉnh sửa.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Voucher được sao chép thành công',
    type: VoucherResponseDto
  })
  @ApiResponse({ status: 404, description: 'Voucher không tồn tại' })
  async duplicateVoucher(@Param('id') id: string) {
    return this.vouchersService.duplicateVoucher(id);
  }

  @Post('bulk-update')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Cập nhật hàng loạt voucher (Admin only)',
    description: 'Cập nhật nhiều voucher cùng lúc với cùng một bộ thông tin. Hữu ích khi cần thay đổi thông tin chung cho nhiều voucher.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Cập nhật voucher thành công',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'number', example: 5, description: 'Số voucher cập nhật thành công' },
        failed: { type: 'number', example: 2, description: 'Số voucher cập nhật thất bại' },
        results: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              voucherId: { type: 'string', example: '507f1f77bcf86cd799439011' },
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Updated successfully' }
            }
          }
        }
      }
    }
  })
  async bulkUpdate(
    @Body() bulkUpdateDto: BulkUpdateVoucherDto
  ) {
    return this.vouchersService.bulkUpdate(bulkUpdateDto.voucherIds, bulkUpdateDto.updateData);
  }

  @Post('calculate-discounts')
  @ApiOperation({ 
    summary: 'Tính toán discount cho nhiều voucher',
    description: 'Tính toán tổng discount cho nhiều voucher cùng lúc. Hỗ trợ kết hợp item và ship voucher. Trả về thông tin chi tiết về discount và lỗi nếu có.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Tính toán discount thành công',
    schema: {
      type: 'object',
      properties: {
        totalItemDiscount: { type: 'number', example: 80000, description: 'Tổng giảm giá cho sản phẩm' },
        totalShipDiscount: { type: 'number', example: 15000, description: 'Tổng giảm giá cho vận chuyển' },
        validVouchers: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              voucherId: { type: 'string', example: '507f1f77bcf86cd799439011' },
              itemDiscount: { type: 'number', example: 50000 },
              shipDiscount: { type: 'number', example: 0 }
            }
          }
        },
        errors: { 
          type: 'array',
          items: {
            type: 'object',
            properties: {
              voucherId: { type: 'string', example: '507f1f77bcf86cd799439012' },
              message: { type: 'string', example: 'Voucher is out of stock' }
            }
          }
        },
        finalTotal: { type: 'number', example: 935000, description: 'Tổng tiền cuối cùng sau khi áp dụng tất cả voucher' }
      }
    }
  })
  async calculateMultipleVouchers(
    @Body() calculateDto: CalculateMultipleVouchersDto
  ) {
    const { userId, subtotal, shipCost, voucherIds } = calculateDto;
    let totalItemDiscount = 0;
    let totalShipDiscount = 0;
    const validVouchers = [];
    const errors = [];

    for (const voucherId of voucherIds) {
      try {
        const result = await this.vouchersService.calculateVoucherDiscount(
          voucherId,
          userId,
          subtotal,
          shipCost
        );

        if (result.valid) {
          totalItemDiscount += result.itemDiscount;
          totalShipDiscount += result.shipDiscount;
          validVouchers.push({
            voucherId,
            itemDiscount: result.itemDiscount,
            shipDiscount: result.shipDiscount
          });
        } else {
          errors.push({
            voucherId,
            message: result.message
          });
        }
      } catch (error) {
        errors.push({
          voucherId,
          message: error.message
        });
      }
    }

    return {
      totalItemDiscount,
      totalShipDiscount,
      validVouchers,
      errors,
      finalTotal: subtotal - totalItemDiscount + (shipCost - totalShipDiscount)
    };
  }
} 