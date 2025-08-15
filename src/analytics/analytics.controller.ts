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
  TopProductDto,
  RevenueByCategoryDto,
  LowStockProductDto,
  TopCustomerDto,
  PaymentMethodStatsDto,
  VoucherUsageDto,
  DateRangeQueryDto,
  DashboardStatsDto,
} from './dto/analytics.dto';
import { AdminGuard } from '@/guards/admin.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Thống kê & Báo cáo')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
@UseGuards(AdminGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Thống kê trang chủ',
    description: 'Lấy tất cả thống kê cần thiết cho trang chủ admin bao gồm: doanh thu hôm nay/hôm qua/tháng này/tháng trước, số đơn hàng theo trạng thái, doanh thu theo tháng, top sản phẩm bán chạy',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy thống kê trang chủ thành công',
    type: DashboardStatsDto,
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getDashboardStats(): Promise<DashboardStatsDto> {
    return this.analyticsService.getDashboardStats();
  }

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

  @Get('top-products')
  @ApiOperation({
    summary: '2. Sản phẩm bán chạy',
    description: 'Top sản phẩm có doanh thu cao nhất trong khoảng thời gian được chọn',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Số lượng sản phẩm top (mặc định 3)',
    example: 3,
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
    description: 'Lấy top sản phẩm bán chạy thành công',
    type: [TopProductDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getTopProducts(
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<TopProductDto[]> {
    const dateRange = startDate || endDate ? { startDate, endDate } : undefined;
    return this.analyticsService.getTopProducts(limit || 3, dateRange);
  }

  @Get('revenue-by-category')
  @ApiOperation({
    summary: '3. Doanh thu theo danh mục',
    description:
      'Biểu đồ tròn thống kê doanh thu theo từng loại sản phẩm (Áo, Quần, Giày...) trong khoảng thời gian được chọn',
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
    description: 'Lấy doanh thu theo danh mục thành công',
    type: [RevenueByCategoryDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getRevenueByCategory(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<RevenueByCategoryDto[]> {
    const dateRange = startDate || endDate ? { startDate, endDate } : undefined;
    return this.analyticsService.getRevenueByCategory(dateRange);
  }

  @Get('low-stock-products')
  @ApiOperation({
    summary: '4. Tồn kho thấp',
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
    summary: '5. Khách hàng tiêu biểu',
    description:
      'Danh sách khách hàng có số đơn hàng nhiều nhất và chi tiêu cao nhất trong khoảng thời gian được chọn',
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
    description: 'Lấy danh sách khách hàng tiêu biểu thành công',
    type: [TopCustomerDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getTopCustomers(
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<TopCustomerDto[]> {
    const dateRange = startDate || endDate ? { startDate, endDate } : undefined;
    return this.analyticsService.getTopCustomers(limit || 10, dateRange);
  }

  @Get('payment-methods')
  @ApiOperation({
    summary: '6. Phương thức thanh toán',
    description:
      'Thống kê số lượng đơn hàng theo từng hình thức thanh toán (Tiền mặt, Chuyển khoản...) trong khoảng thời gian được chọn',
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
    description: 'Lấy thống kê phương thức thanh toán thành công',
    type: [PaymentMethodStatsDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getPaymentMethodStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<PaymentMethodStatsDto[]> {
    const dateRange = startDate || endDate ? { startDate, endDate } : undefined;
    return this.analyticsService.getPaymentMethodStats(dateRange);
  }

  @Get('voucher-usage')
  @ApiOperation({
    summary: '7. Mã giảm giá được sử dụng',
    description: 'Thống kê lượt sử dụng và hiệu quả của từng mã voucher trong khoảng thời gian được chọn',
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
    description: 'Lấy thống kê sử dụng voucher thành công',
    type: [VoucherUsageDto],
  })
  @ApiResponse({ status: 403, description: 'Chỉ admin mới có quyền truy cập' })
  async getVoucherUsageStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<VoucherUsageDto[]> {
    const dateRange = startDate || endDate ? { startDate, endDate } : undefined;
    return this.analyticsService.getVoucherUsageStats(dateRange);
  }
}