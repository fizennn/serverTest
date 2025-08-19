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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReturnOrdersService } from '../services/return-orders.service';
import {
  ReturnOrderDto,
  UpdateReturnStatusDto,
  PaginatedReturnOrderResponseDto,
} from '../dtos/return-order.dto';
import { JwtAuthGuard } from '@/guards/jwt-auth.guard';
import { AdminGuard } from '@/guards/admin.guard';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { UserDocument } from '@/users/schemas/user.schema';

@ApiTags('Trả hàng')
@Controller('return-orders')
export class ReturnOrdersController {
  constructor(private returnOrdersService: ReturnOrdersService) {}

  @UseGuards(JwtAuthGuard)
  @Post('orders/:orderId/return')
  @ApiOperation({
    summary: 'Tạo yêu cầu trả hàng',
    description:
      'Khách hàng tạo yêu cầu trả hàng cho đơn hàng đã giao thành công. Chỉ có thể trả hàng trong vòng 7 ngày sau khi giao hàng thành công. Trạng thái đơn hàng sẽ được cập nhật thành "return". Mỗi item cần có itemId để xác định chính xác item nào trong order cần trả.',
  })
  @ApiParam({ name: 'orderId', description: 'ID đơn hàng' })
  @ApiResponse({ status: 201, description: 'Tạo yêu cầu trả hàng thành công' })
  @ApiResponse({ status: 400, description: 'Không thể tạo yêu cầu trả hàng' })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền trả hàng đơn hàng này',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async createReturnRequest(
    @Param('orderId') orderId: string,
    @Body() returnOrderDto: ReturnOrderDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.returnOrdersService.createReturnRequest(
      orderId,
      returnOrderDto,
      user._id.toString(),
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('orders/:orderId/return')
  @ApiOperation({
    summary: 'Lấy thông tin yêu cầu trả hàng theo orderId',
    description: 'Lấy thông tin yêu cầu trả hàng của đơn hàng',
  })
  @ApiParam({ name: 'orderId', description: 'ID đơn hàng' })
  @ApiResponse({ status: 200, description: 'Thông tin yêu cầu trả hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu trả hàng' })
  async getReturnRequestByOrderId(@Param('orderId') orderId: string) {
    return this.returnOrdersService.getReturnRequest(orderId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get/:id')
  @ApiOperation({
    summary: 'Lấy thông tin yêu cầu trả hàng theo ID',
    description: 'Lấy chi tiết yêu cầu trả hàng theo ID',
  })
  @ApiParam({ name: 'id', description: 'ID yêu cầu trả hàng' })
  @ApiResponse({ status: 200, description: 'Thông tin yêu cầu trả hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu trả hàng' })
  async getReturnRequestById(@Param('id') id: string) {
    return this.returnOrdersService.getReturnRequestById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-returns')
  @ApiOperation({
    summary: 'Lấy danh sách yêu cầu trả hàng của khách hàng',
    description: 'Lấy tất cả yêu cầu trả hàng của khách hàng hiện tại',
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
    description: 'Danh sách yêu cầu trả hàng',
    type: PaginatedReturnOrderResponseDto,
  })
  async getMyReturnRequests(
    @CurrentUser() user: UserDocument,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    console.log('=== MY-RETURNS ENDPOINT CALLED ===');
    console.log('User object:', user);
    console.log('User _id:', user._id);
    console.log('User _id type:', typeof user._id);
    console.log('User _id toString:', user._id.toString());
    console.log('User _id toString type:', typeof user._id.toString());
    
    // Validate user object
    if (!user || !user._id) {
      throw new BadRequestException('Thông tin người dùng không hợp lệ');
    }

    const userId = user._id.toString();
    
    // Validate userId format
    if (!userId || userId === 'undefined' || userId === 'null') {
      throw new BadRequestException('ID người dùng không hợp lệ');
    }

    // Validate query parameters
    const pageNumber = page ? parseInt(page.toString()) : 1;
    const limitNumber = limit ? parseInt(limit.toString()) : 10;
    
    if (isNaN(pageNumber) || pageNumber < 1) {
      throw new BadRequestException('Số trang không hợp lệ');
    }
    
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      throw new BadRequestException('Số lượng item trên trang không hợp lệ');
    }

    return this.returnOrdersService.getCustomerReturnRequests(
      userId,
      pageNumber,
      limitNumber,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('test-my-returns')
  @ApiOperation({
    summary: 'Test: Lấy return orders của user (test endpoint)',
    description: 'Test endpoint để debug',
  })
  async testMyReturns(@CurrentUser() user: UserDocument) {
    console.log('=== TEST ENDPOINT CALLED ===');
    console.log('User object:', user);
    console.log('User _id:', user._id);
    console.log('User _id type:', typeof user._id);
    console.log('User _id toString:', user._id.toString());
    
    // Validate user object
    if (!user || !user._id) {
      throw new BadRequestException('Thông tin người dùng không hợp lệ');
    }

    const userId = user._id.toString();
    
    // Validate userId format
    if (!userId || userId === 'undefined' || userId === 'null') {
      throw new BadRequestException('ID người dùng không hợp lệ');
    }

    return this.returnOrdersService.getCustomerReturnRequests(
      userId,
      1,
      10,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('debug/all-returns')
  @ApiOperation({
    summary: 'Debug: Lấy tất cả return orders (chỉ để debug)',
    description: 'Lấy tất cả return orders trong database để debug',
  })
  async debugAllReturns() {
    return this.returnOrdersService.debugAllReturns();
  }

  @UseGuards(AdminGuard)
  @Get()
  @ApiOperation({
    summary: 'Lấy tất cả yêu cầu trả hàng (Admin)',
    description: 'Admin lấy tất cả yêu cầu trả hàng trong hệ thống',
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
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Lọc theo trạng thái',
    enum: ['pending', 'approved', 'rejected', 'processing', 'completed'],
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách yêu cầu trả hàng',
    type: PaginatedReturnOrderResponseDto,
  })
  async getAllReturnRequests(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.returnOrdersService.getAllReturnRequests(page, limit, status);
  }

  @UseGuards(AdminGuard)
  @Put(':id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái yêu cầu trả hàng (Admin)',
    description:
      'Admin cập nhật trạng thái yêu cầu trả hàng và xử lý hoàn tiền. Trạng thái đơn hàng sẽ được cập nhật thành "return" cho tất cả các trạng thái return.',
  })
  @ApiParam({ name: 'id', description: 'ID yêu cầu trả hàng' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu trả hàng' })
  async updateReturnStatus(
    @Param('id') id: string,
    @Body() updateReturnStatusDto: UpdateReturnStatusDto,
  ) {
    return this.returnOrdersService.updateReturnStatus(
      id,
      updateReturnStatusDto,
    );
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa yêu cầu trả hàng (Admin)',
    description:
      'Admin xóa yêu cầu trả hàng (chỉ cho phép xóa những yêu cầu đang chờ xử lý)',
  })
  @ApiParam({ name: 'id', description: 'ID yêu cầu trả hàng' })
  @ApiResponse({ status: 200, description: 'Xóa yêu cầu trả hàng thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu trả hàng' })
  async deleteReturnRequest(@Param('id') id: string) {
    await this.returnOrdersService.deleteReturnRequest(id);
    return { message: 'Yêu cầu trả hàng đã được xóa thành công' };
  }

  @UseGuards(AdminGuard)
  @Get('statistics')
  @ApiOperation({
    summary: 'Thống kê trả hàng (Admin)',
    description: 'Lấy thống kê về các yêu cầu trả hàng',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2025-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2025-12-31',
  })
  @ApiResponse({ status: 200, description: 'Thống kê trả hàng' })
  async getReturnStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.returnOrdersService.getReturnStatistics({
      startDate,
      endDate,
    });
  }
}
