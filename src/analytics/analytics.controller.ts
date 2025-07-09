// analytics/controllers/analytics.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import {
  OrderOverviewDto,
  RevenueByTimeDto,
  TopProductDto,
  RevenueByCategoryDto,
  LowStockProductDto,
  TopCustomerDto,
  PaymentMethodStatsDto,
  VoucherUsageDto,
  DateRangeQueryDto,
} from './dto/analytics.dto';
import { AdminGuard } from '@/guards/admin.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Thống kê & Báo cáo')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
@UseGuards(AdminGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({
    summary: '1. Tổng quan đơn hàng',
    description:
      'Lấy thống kê tổng quan về đơn hàng: tổng đơn, đơn thành công, đơn hủy, sản phẩm đã bán, doanh thu',
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
    description: 'Lấy thống kê tổng quan thành công',
    type: OrderOverviewDto,
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getOrderOverview(
    @Query() dateRange: DateRangeQueryDto,
  ): Promise<OrderOverviewDto> {
    return this.analyticsService.getOrderOverview(dateRange);
  }

  @Get('revenue-by-time')
  @ApiOperation({
    summary: '2. Doanh thu theo thời gian',
    description:
      'Biểu đồ doanh thu theo ngày/tháng/năm với khả năng lọc theo khoảng thời gian',
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
    description: 'Loại thời gian nhóm dữ liệu',
    enum: ['day', 'month', 'year'],
    example: 'month',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy doanh thu theo thời gian thành công',
    type: [RevenueByTimeDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getRevenueByTime(
    @Query() dateRange: DateRangeQueryDto,
  ): Promise<RevenueByTimeDto[]> {
    return this.analyticsService.getRevenueByTime(dateRange);
  }

  @Get('top-products')
  @ApiOperation({
    summary: '3. Sản phẩm bán chạy',
    description: 'Top 3 sản phẩm có doanh thu cao nhất',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng sản phẩm top (mặc định 3)',
    example: 3,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy top sản phẩm bán chạy thành công',
    type: [TopProductDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getTopProducts(
    @Query('limit') limit?: number,
  ): Promise<TopProductDto[]> {
    return this.analyticsService.getTopProducts(limit || 3);
  }

  @Get('revenue-by-category')
  @ApiOperation({
    summary: '4. Doanh thu theo danh mục',
    description:
      'Biểu đồ tròn thống kê doanh thu theo từng loại sản phẩm (Áo, Quần, Giày...)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy doanh thu theo danh mục thành công',
    type: [RevenueByCategoryDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getRevenueByCategory(): Promise<RevenueByCategoryDto[]> {
    return this.analyticsService.getRevenueByCategory();
  }

  @Get('low-stock-products')
  @ApiOperation({
    summary: '5. Tồn kho thấp',
    description:
      'Danh sách sản phẩm sắp hết hàng (tồn kho dưới ngưỡng cảnh báo)',
  })
  @ApiQuery({
    name: 'threshold',
    required: false,
    description: 'Ngưỡng cảnh báo tồn kho (mặc định 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách sản phẩm tồn kho thấp thành công',
    type: [LowStockProductDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getLowStockProducts(
    @Query('threshold') threshold?: number,
  ): Promise<LowStockProductDto[]> {
    return this.analyticsService.getLowStockProducts(threshold || 10);
  }

  @Get('top-customers')
  @ApiOperation({
    summary: '6. Khách hàng tiêu biểu',
    description:
      'Danh sách khách hàng có số đơn hàng nhiều nhất và chi tiêu cao nhất',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng khách hàng top (mặc định 10)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách khách hàng tiêu biểu thành công',
    type: [TopCustomerDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getTopCustomers(
    @Query('limit') limit?: number,
  ): Promise<TopCustomerDto[]> {
    return this.analyticsService.getTopCustomers(limit || 10);
  }

  @Get('payment-methods')
  @ApiOperation({
    summary: '7. Phương thức thanh toán',
    description:
      'Thống kê số lượng đơn hàng theo từng hình thức thanh toán (Tiền mặt, Chuyển khoản...)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê phương thức thanh toán thành công',
    type: [PaymentMethodStatsDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getPaymentMethodStats(): Promise<PaymentMethodStatsDto[]> {
    return this.analyticsService.getPaymentMethodStats();
  }

  @Get('voucher-usage')
  @ApiOperation({
    summary: '8. Mã giảm giá được sử dụng',
    description: 'Thống kê lượt sử dụng và hiệu quả của từng mã voucher',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê sử dụng voucher thành công',
    type: [VoucherUsageDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getVoucherUsageStats(): Promise<VoucherUsageDto[]> {
    return this.analyticsService.getVoucherUsageStats();
  }
}
