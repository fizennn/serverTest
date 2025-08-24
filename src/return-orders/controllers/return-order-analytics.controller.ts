// return-orders/controllers/return-order-analytics.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import {
  ReturnOrderOverviewDto,
  TopReturnReasonDto,
  ReturnByCategoryDto,
  TopReturnCustomerDto,
  ReturnByTimeDto,
  ReturnOrderDashboardDto,
  DateRangeQueryDto,
} from '../dtos/return-order-analytics.dto';
import { AdminGuard } from '@/guards/admin.guard';
import { ReturnOrderAnalyticsService } from '../services/return-order-analytics.service';

@ApiTags('Thống kê Trả hàng')
@ApiBearerAuth('JWT-auth')
@Controller('return-orders/analytics')
@UseGuards(AdminGuard)
export class ReturnOrderAnalyticsController {
  constructor(private readonly returnOrderAnalyticsService: ReturnOrderAnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Thống kê trang chủ trả hàng',
    description: 'Lấy tất cả thống kê cần thiết cho trang chủ admin về trả hàng bao gồm: yêu cầu trả hàng hôm nay/hôm qua/tháng này/tháng trước, số tiền hoàn trả, tỷ lệ chấp nhận',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê trang chủ trả hàng thành công',
    type: ReturnOrderDashboardDto,
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getReturnOrderDashboard(): Promise<ReturnOrderDashboardDto> {
    return this.returnOrderAnalyticsService.getReturnOrderDashboard();
  }

  @Get('overview')
  @ApiOperation({
    summary: '1. Tổng quan yêu cầu trả hàng',
    description:
      'Lấy thống kê tổng quan về yêu cầu trả hàng: tổng yêu cầu, yêu cầu được chấp nhận, bị từ chối, đang xử lý, đã hoàn thành, sản phẩm trả, tiền hoàn trả',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Ngày bắt đầu lọc (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Ngày kết thúc lọc (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê tổng quan trả hàng thành công',
    type: ReturnOrderOverviewDto,
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getReturnOrderOverview(
    @Query() dateRange: DateRangeQueryDto,
  ): Promise<ReturnOrderOverviewDto> {
    return this.returnOrderAnalyticsService.getReturnOrderOverview(dateRange);
  }

  @Get('top-reasons')
  @ApiOperation({
    summary: '2. Lý do trả hàng phổ biến',
    description: 'Top lý do trả hàng được sử dụng nhiều nhất trong khoảng thời gian được chọn',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng lý do top (mặc định 5)',
    example: 5,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Ngày bắt đầu lọc (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Ngày kết thúc lọc (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy top lý do trả hàng thành công',
    type: [TopReturnReasonDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getTopReturnReasons(
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<TopReturnReasonDto[]> {
    const dateRange = startDate || endDate ? { startDate, endDate } : undefined;
    return this.returnOrderAnalyticsService.getTopReturnReasons(limit || 5, dateRange);
  }

  @Get('return-by-category')
  @ApiOperation({
    summary: '3. Trả hàng theo danh mục',
    description:
      'Biểu đồ tròn thống kê số lượng sản phẩm trả và tiền hoàn trả theo từng danh mục sản phẩm trong khoảng thời gian được chọn',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Ngày bắt đầu lọc (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Ngày kết thúc lọc (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê trả hàng theo danh mục thành công',
    type: [ReturnByCategoryDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getReturnByCategory(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ReturnByCategoryDto[]> {
    const dateRange = startDate || endDate ? { startDate, endDate } : undefined;
    return this.returnOrderAnalyticsService.getReturnByCategory(dateRange);
  }

  @Get('top-return-customers')
  @ApiOperation({
    summary: '4. Khách hàng trả hàng nhiều nhất',
    description:
      'Danh sách khách hàng có số yêu cầu trả hàng nhiều nhất và tổng tiền hoàn trả cao nhất trong khoảng thời gian được chọn',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng khách hàng top (mặc định 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Ngày bắt đầu lọc (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Ngày kết thúc lọc (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách khách hàng trả hàng nhiều nhất thành công',
    type: [TopReturnCustomerDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getTopReturnCustomers(
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<TopReturnCustomerDto[]> {
    const dateRange = startDate || endDate ? { startDate, endDate } : undefined;
    return this.returnOrderAnalyticsService.getTopReturnCustomers(limit || 10, dateRange);
  }

  @Get('return-by-time')
  @ApiOperation({
    summary: '5. Trả hàng theo thời gian',
    description: 'Thống kê yêu cầu trả hàng và tiền hoàn trả theo từng ngày, tháng hoặc năm',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiQuery({
    name: 'timeType',
    required: false,
    description: 'Kiểu thời gian nhóm dữ liệu (day, month, year)',
    example: 'month',
    enum: ['day', 'month', 'year'],
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê trả hàng theo thời gian thành công',
    type: [ReturnByTimeDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getReturnByTime(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('timeType') timeType: 'day' | 'month' | 'year' = 'month',
  ): Promise<ReturnByTimeDto[]> {
    const dateRange = startDate || endDate ? { startDate, endDate } : undefined;
    return this.returnOrderAnalyticsService.getReturnByTime(dateRange, timeType);
  }

  @Get('return-type-analysis')
  @ApiOperation({
    summary: '6. Phân tích theo loại trả hàng',
    description: 'Thống kê phân tích yêu cầu trả hàng theo loại (refund/exchange)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Ngày bắt đầu lọc (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Ngày kết thúc lọc (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy phân tích theo loại trả hàng thành công',
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getReturnTypeAnalysis(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate || endDate ? { startDate, endDate } : undefined;
    return this.returnOrderAnalyticsService.getReturnTypeAnalysis(dateRange);
  }
}
