// analytics/dtos/analytics.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';

export class DateRangeQueryDto {
  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2024-01-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class OrderOverviewDto {
  @ApiProperty({ description: 'Tổng số đơn hàng', example: 1250 })
  totalOrders: number;

  @ApiProperty({ description: 'Đơn hàng thành công', example: 980 })
  successfulOrders: number;

  @ApiProperty({ description: 'Đơn hàng bị hủy', example: 270 })
  cancelledOrders: number;

  @ApiProperty({ description: 'Tổng sản phẩm đã bán', example: 3450 })
  totalProductsSold: number;

  @ApiProperty({ description: 'Tổng doanh thu (VNĐ)', example: 125000000 })
  totalRevenue: number;

  @ApiProperty({ description: 'Tỷ lệ thành công (%)', example: 78.4 })
  successRate: number;

  @ApiProperty({ 
    description: 'Thống kê đơn hàng theo trạng thái',
    example: {
      pending: 50,
      confirmed: 30,
      shipping: 25,
      delivered: 980,
      cancelled: 270,
      'return-pending': 5,
      'return-approved': 3,
      'return-processing': 2,
      'return-completed': 8,
      'return-rejected': 1
    }
  })
  orderStatusStats: {
    pending: number;
    confirmed: number;
    shipping: number;
    delivered: number;
    cancelled: number;
    'return-pending': number;
    'return-approved': number;
    'return-processing': number;
    'return-completed': number;
    'return-rejected': number;
  };
}

export class TopProductDto {
  @ApiProperty({ description: 'ID sản phẩm', example: '507f1f77bcf86cd799439011' })
  productId: string;

  @ApiProperty({ description: 'Tên sản phẩm', example: 'Áo thun nam cổ tròn' })
  productName: string;

  @ApiProperty({ description: 'Hình ảnh sản phẩm', example: 'https://example.com/image.jpg' })
  image: string;

  @ApiProperty({ description: 'Số lượng đã bán', example: 150 })
  soldQuantity: number;

  @ApiProperty({ description: 'Doanh thu (VNĐ)', example: 7500000 })
  revenue: number;

  @ApiProperty({ description: 'Danh mục', example: 'Áo' })
  category: string;
}

export class RevenueByCategoryDto {
  @ApiProperty({ description: 'Tên danh mục', example: 'Áo' })
  categoryName: string;

  @ApiProperty({ description: 'Doanh thu (VNĐ)', example: 45000000 })
  revenue: number;

  @ApiProperty({ description: 'Số sản phẩm đã bán', example: 890 })
  productsSold: number;

  @ApiProperty({ description: 'Phần trăm doanh thu (%)', example: 36.5 })
  percentage: number;
}

export class LowStockProductDto {
  @ApiProperty({ description: 'ID sản phẩm', example: '507f1f77bcf86cd799439011' })
  productId: string;

  @ApiProperty({ description: 'Tên sản phẩm', example: 'Quần jean nam' })
  productName: string;

  @ApiProperty({ description: 'Hình ảnh sản phẩm', example: 'https://example.com/image.jpg' })
  image: string;

  @ApiProperty({ description: 'Số lượng tồn kho', example: 5 })
  currentStock: number;

  @ApiProperty({ description: 'Danh mục', example: 'Quần' })
  category: string;

  @ApiProperty({ description: 'Biến thể có tồn kho thấp' })
  lowStockVariants: {
    color: string;
    size: string;
    stock: number;
  }[];
}

export class TopCustomerDto {
  @ApiProperty({ description: 'ID khách hàng', example: '507f1f77bcf86cd799439011' })
  customerId: string;

  @ApiProperty({ description: 'Tên khách hàng', example: 'Nguyễn Văn A' })
  customerName: string;

  @ApiProperty({ description: 'Email khách hàng', example: 'customer@example.com' })
  email: string;

  @ApiProperty({ description: 'Số đơn hàng', example: 25 })
  orderCount: number;

  @ApiProperty({ description: 'Tổng chi tiêu (VNĐ)', example: 12500000 })
  totalSpent: number;

  @ApiProperty({ description: 'Đơn hàng trung bình (VNĐ)', example: 500000 })
  averageOrderValue: number;
}

export class PaymentMethodStatsDto {
  @ApiProperty({ description: 'Phương thức thanh toán', example: 'COD' })
  paymentMethod: string;

  @ApiProperty({ description: 'Số đơn hàng', example: 750 })
  orderCount: number;

  @ApiProperty({ description: 'Doanh thu (VNĐ)', example: 45000000 })
  revenue: number;

  @ApiProperty({ description: 'Phần trăm đơn hàng (%)', example: 60.5 })
  percentage: number;
}

export class VoucherUsageDto {
  @ApiProperty({ description: 'ID voucher', example: '507f1f77bcf86cd799439011' })
  voucherId: string;

  @ApiProperty({ description: 'Loại voucher', example: 'item' })
  type: string;

  @ApiProperty({ description: 'Phần trăm giảm giá (%)', example: 10 })
  discount: number;

  @ApiProperty({ description: 'Số lần sử dụng', example: 125 })
  usageCount: number;

  @ApiProperty({ description: 'Tổng tiền đã giảm (VNĐ)', example: 2500000 })
  totalDiscountAmount: number;

  @ApiProperty({ description: 'Doanh thu từ đơn có voucher (VNĐ)', example: 15000000 })
  revenueFromVoucherOrders: number;
}