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

  @ApiProperty({ description: 'Thanh toán tiền mặt (VNĐ)', example: 75000000 })
  cashPayment: number;

  @ApiProperty({ description: 'Thanh toán chuyển khoản (VNĐ)', example: 50000000 })
  bankTransfer: number;

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
          'return': 19
    }
  })
  orderStatusStats: {
    pending: number;
    confirmed: number;
    shipping: number;
    delivered: number;
    cancelled: number;
      'return': number;
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

export class DashboardStatsDto {
  @ApiProperty({ 
    description: 'Thống kê đơn hàng hôm nay',
    example: {
      totalRevenue: 15000000,
      cashPayment: 8000000,
      bankTransfer: 7000000
    }
  })
  todayStats: {
    totalRevenue: number;
    cashPayment: number;
    bankTransfer: number;
  };

  @ApiProperty({ 
    description: 'Thống kê đơn hàng hôm qua',
    example: {
      totalRevenue: 12000000,
      cashPayment: 6000000,
      bankTransfer: 6000000
    }
  })
  yesterdayStats: {
    totalRevenue: number;
    cashPayment: number;
    bankTransfer: number;
  };

  @ApiProperty({ 
    description: 'Thống kê đơn hàng tháng này',
    example: {
      totalRevenue: 450000000,
      cashPayment: 230000000,
      bankTransfer: 220000000
    }
  })
  thisMonthStats: {
    totalRevenue: number;
    cashPayment: number;
    bankTransfer: number;
  };

  @ApiProperty({ 
    description: 'Thống kê đơn hàng tháng trước',
    example: {
      totalRevenue: 380000000,
      cashPayment: 190000000,
      bankTransfer: 190000000
    }
  })
  lastMonthStats: {
    totalRevenue: number;
    cashPayment: number;
    bankTransfer: number;
  };

  @ApiProperty({ description: 'Tổng số đơn hàng từ trước đến nay', example: 1250 })
  totalOrders: number;

  @ApiProperty({ description: 'Tổng số đơn chờ xử lý', example: 25 })
  pendingOrders: number;

  @ApiProperty({ description: 'Tổng số đơn đang xử lý', example: 15 })
  processingOrders: number;

  @ApiProperty({ description: 'Tổng số đơn đã giao', example: 980 })
  deliveredOrders: number;

  @ApiProperty({ 
    description: 'Doanh thu theo tháng trong năm',
    example: {
      '1': 45000000,
      '2': 52000000,
      '3': 48000000,
      '4': 55000000,
      '5': 60000000,
      '6': 58000000,
      '7': 62000000,
      '8': 65000000,
      '9': 68000000,
      '10': 72000000,
      '11': 75000000,
      '12': 80000000
    }
  })
  monthlyRevenue: {
    [key: string]: number;
  };

  @ApiProperty({ 
    description: 'Top sản phẩm bán chạy nhất',
    type: [TopProductDto]
  })
  topProducts: TopProductDto[];
}

export class RevenueByTimeDto {
  @ApiProperty({ description: 'Khoảng thời gian', example: '2024-01' })
  period: string;

  @ApiProperty({ description: 'Doanh thu (VNĐ)', example: 12500000 })
  revenue: number;

  @ApiProperty({ description: 'Số đơn hàng', example: 125 })
  orderCount: number;
}