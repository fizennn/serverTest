import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from 'src/guards/admin.guard';
import { OrdersService } from '../services/orders.service';
import { UserDocument } from '@/users/schemas/user.schema';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateOrderDto } from '../dtos/create-order.dto';
import {
  UpdateOrderDto,
  PaginatedOrderResponseDto,
} from '../dtos/update-order.dto';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePaymentStatusDto {
  @ApiProperty({ description: 'Trạng thái thanh toán', enum: ['unpaid', 'paid', 'refunded'], example: 'paid' })
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
}

@ApiTags('Đơn hàng')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({
    summary: 'Tạo đơn hàng mới',
    description:
      'Tạo đơn hàng với hệ thống voucher mới. Hỗ trợ 2 loại voucher: item (giảm giá sản phẩm) và ship (giảm giá vận chuyển). Mỗi voucher có điều kiện tối thiểu và giới hạn giảm giá riêng. Hỗ trợ mua tại cửa hàng (atStore = true) - không tính phí ship. Hỗ trợ 2 phương thức thanh toán: COD (tiền mặt) và payOS (chuyển khoản).',
  })
  @ApiResponse({
    status: 201,
    description: 'Đơn hàng được tạo thành công',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        idUser: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439012' },
            name: { type: 'string', example: 'Nguyễn Văn A' },
            email: { type: 'string', example: 'user@example.com' },
          },
        },
        atStore: {
          type: 'boolean',
          example: false,
          description:
            'Xác định đơn hàng mua tại cửa hàng (không tính phí ship)',
        },
        payment: {
          type: 'string',
          example: 'COD',
          description:
            'Phương thức thanh toán (COD: tiền mặt, payOS: chuyển khoản)',
        },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              product: {
                type: 'object',
                properties: {
                  _id: { type: 'string', example: '507f1f77bcf86cd799439013' },
                  name: { type: 'string', example: 'Áo thun nam' },
                  images: { type: 'array', items: { type: 'string' } },
                  price: { type: 'number', example: 500000 },
                },
              },
              quantity: { type: 'number', example: 2 },
              price: { type: 'number', example: 500000 },
              variant: { type: 'string', example: 'Áo thun nam - Đỏ - M' },
            },
          },
        },
        address: {
          type: 'object',
          properties: {
            phone: { type: 'string', example: '0123456789' },
            name: { type: 'string', example: 'Nha rieng 1' },

            address: {
              type: 'string',
              example: '123 Đường ABC, Quận 1, TP.HCM',
            },
          },
        },
        vouchers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              voucherId: {
                type: 'string',
                example: '68565473537f64f28418e85c',
                description: 'ID của voucher',
              },
              type: {
                type: 'string',
                example: 'item',
                enum: ['item', 'ship'],
                description: 'Loại voucher',
              },
              disCount: {
                type: 'number',
                example: 10,
                description: 'Phần trăm giảm giá (%) tại thời điểm tạo order',
              },
              condition: {
                type: 'number',
                example: 500000,
                description:
                  'Điều kiện tối thiểu (VNĐ) tại thời điểm tạo order',
              },
              limit: {
                type: 'number',
                example: 100000,
                description:
                  'Giới hạn giảm giá tối đa (VNĐ) tại thời điểm tạo order',
              },
              appliedDiscount: {
                type: 'number',
                example: 50000,
                description: 'Số tiền giảm giá thực tế được áp dụng',
              },
            },
          },
          description:
            'Snapshot thông tin voucher tại thời điểm tạo order (không thay đổi sau này)',
        },
        subtotal: {
          type: 'number',
          example: 1000000,
          description: 'Tổng tiền sản phẩm trước giảm giá',
        },
        itemDiscount: {
          type: 'number',
          example: 50000,
          description: 'Tổng giảm giá cho sản phẩm',
        },
        shipDiscount: {
          type: 'number',
          example: 10000,
          description: 'Tổng giảm giá cho vận chuyển',
        },
        total: {
          type: 'number',
          example: 940000,
          description: 'Tổng tiền cuối cùng sau khi áp dụng voucher',
        },
        shipCost: {
          type: 'number',
          example: 30000,
          description: 'Phí vận chuyển (0 nếu atStore = true)',
        },
        status: { type: 'string', example: 'pending' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Dữ liệu không hợp lệ, sản phẩm không tồn tại, không đủ tồn kho, hoặc voucher không hợp lệ',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy user hoặc địa chỉ' })
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.ordersService.create(createOrderDto, user._id.toString());
  }

  @UseGuards(AdminGuard)
  @Get()
  @ApiOperation({
    summary: 'Lấy tất cả đơn hàng (Admin)',
    description:
      'Lấy danh sách tất cả đơn hàng có phân trang. Sắp xếp theo thời gian tạo mới nhất.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Trang hiện tại',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng item trên mỗi trang',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách đơn hàng có phân trang',
    type: PaginatedOrderResponseDto,
  })
  async getOrders(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.findAll(page, limit);
  }

  @UseGuards(AdminGuard)
  @Get('status/:status')
  @ApiOperation({
    summary: 'Lấy đơn hàng theo trạng thái (Admin)',
    description:
      'Lấy danh sách đơn hàng theo trạng thái có phân trang. Sắp xếp theo thời gian tạo mới nhất.',
  })
  @ApiParam({
    name: 'status',
    description: 'Trạng thái đơn hàng',
    enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Trang hiện tại',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng item trên mỗi trang',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách đơn hàng theo trạng thái có phân trang',
    type: PaginatedOrderResponseDto,
  })
  async getOrdersByStatus(
    @Param('status') status: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.findOrdersByStatus(status, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('myorders')
  @ApiOperation({
    summary: 'Lấy đơn hàng của người dùng hiện tại',
    description:
      'Lấy danh sách đơn hàng của user hiện tại có phân trang. Sắp xếp theo thời gian tạo mới nhất.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Trang hiện tại',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng item trên mỗi trang',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách đơn hàng của user có phân trang',
    type: PaginatedOrderResponseDto,
  })
  async getUserOrders(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.findUserOrders(user._id.toString(), page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết đơn hàng theo ID' })
  @ApiParam({ name: 'id', description: 'ID đơn hàng' })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async getOrder(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  @UseGuards(AdminGuard)
  @Put(':id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái đơn hàng (Admin)',
    description:
      'Cập nhật trạng thái, ghi chú, phương thức thanh toán hoặc chuyển đổi giữa mua tại cửa hàng và giao hàng. Khi atStore = true, phí ship sẽ được đặt về 0. Hỗ trợ 2 phương thức thanh toán: COD (tiền mặt) và payOS (chuyển khoản).',
  })
  @ApiParam({ name: 'id', description: 'ID đơn hàng' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.updateStatus(id, updateOrderDto);
  }

  @UseGuards(AdminGuard)
  @Put(':id/confirm')
  @ApiOperation({ summary: 'Xác nhận đơn hàng (Admin)' })
  @ApiParam({ name: 'id', description: 'ID đơn hàng' })
  @ApiResponse({ status: 200, description: 'Xác nhận thành công' })
  async confirmOrder(@Param('id') id: string) {
    return this.ordersService.updateToConfirmed(id);
  }

  @UseGuards(AdminGuard)
  @Put(':id/ship')
  @ApiOperation({ summary: 'Bắt đầu vận chuyển đơn hàng (Admin)' })
  @ApiParam({ name: 'id', description: 'ID đơn hàng' })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái vận chuyển thành công',
  })
  async shipOrder(@Param('id') id: string) {
    return this.ordersService.updateToShipping(id);
  }

  @UseGuards(AdminGuard)
  @Put(':id/deliver')
  @ApiOperation({ summary: 'Xác nhận giao hàng thành công (Admin)' })
  @ApiParam({ name: 'id', description: 'ID đơn hàng' })
  @ApiResponse({ status: 200, description: 'Xác nhận giao hàng thành công' })
  async deliverOrder(@Param('id') id: string) {
    return this.ordersService.updateToDelivered(id);
  }

  @UseGuards(AdminGuard)
  @Put(':id/cancel')
  @ApiOperation({ summary: 'Hủy đơn hàng (Admin)' })
  @ApiParam({ name: 'id', description: 'ID đơn hàng' })
  @ApiResponse({ status: 200, description: 'Hủy đơn hàng thành công' })
  async cancelOrder(@Param('id') id: string) {
    return this.ordersService.updateToCancelled(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/cancel-user')
  @ApiOperation({
    summary: 'Hủy đơn hàng (User)',
    description:
      'Người dùng có thể hủy đơn hàng của mình khi đơn hàng đang ở trạng thái pending hoặc confirmed',
  })
  @ApiParam({ name: 'id', description: 'ID đơn hàng' })
  @ApiResponse({ status: 200, description: 'Hủy đơn hàng thành công' })
  @ApiResponse({
    status: 400,
    description: 'Không thể hủy đơn hàng ở trạng thái hiện tại',
  })
  @ApiResponse({ status: 403, description: 'Không có quyền hủy đơn hàng này' })
  async cancelUserOrder(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ) {
    return this.ordersService.cancelUserOrder(id, user._id.toString());
  }
  @UseGuards(AdminGuard)
  @Put(':id/payment-status')
  @ApiOperation({ summary: 'Cập nhật trạng thái thanh toán đơn hàng (Admin)' })
  @ApiParam({ name: 'id', description: 'ID đơn hàng' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thanh toán thành công' })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() body: UpdatePaymentStatusDto
  ) {
    return this.ordersService.updatePaymentStatus(id, body.paymentStatus);
  }
  @UseGuards(AdminGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đơn hàng (Admin)' })
  @ApiParam({ name: 'id', description: 'ID đơn hàng' })
  @ApiResponse({ status: 200, description: 'Xóa đơn hàng thành công' })
  async deleteOrder(@Param('id') id: string) {
    await this.ordersService.deleteOrder(id);
    return { message: 'Đơn hàng đã được xóa thành công' };
  }
}
