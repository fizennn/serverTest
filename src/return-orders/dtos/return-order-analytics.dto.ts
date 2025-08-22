// return-orders/dtos/return-order-analytics.dto.ts
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

export class ReturnOrderOverviewDto {
  @ApiProperty({ description: 'Tổng số yêu cầu trả hàng', example: 150 })
  totalReturnRequests: number;

  @ApiProperty({ description: 'Yêu cầu đã được chấp nhận', example: 120 })
  approvedReturns: number;

  @ApiProperty({ description: 'Yêu cầu bị từ chối', example: 20 })
  rejectedReturns: number;

  @ApiProperty({ description: 'Yêu cầu đang xử lý', example: 10 })
  processingReturns: number;

  @ApiProperty({ description: 'Yêu cầu đã hoàn thành', example: 100 })
  completedReturns: number;

  @ApiProperty({ description: 'Tổng sản phẩm được trả', example: 250 })
  totalProductsReturned: number;

  @ApiProperty({ description: 'Tổng số tiền hoàn trả (VNĐ)', example: 15000000 })
  totalRefundAmount: number;

  @ApiProperty({ description: 'Tỷ lệ chấp nhận trả hàng (%)', example: 80.0 })
  approvalRate: number;

  @ApiProperty({ 
    description: 'Thống kê yêu cầu trả hàng theo trạng thái',
    example: {
      pending: 50,
      approved: 120,
      rejected: 20,
      processing: 10,
      completed: 100
    }
  })
  returnStatusStats: {
    pending: number;
    approved: number;
    rejected: number;
    processing: number;
    completed: number;
  };
}

export class TopReturnReasonDto {
  @ApiProperty({ description: 'Lý do trả hàng', example: 'Sản phẩm bị lỗi' })
  reason: string;

  @ApiProperty({ description: 'Số lượng yêu cầu', example: 45 })
  count: number;

  @ApiProperty({ description: 'Tỷ lệ (%)', example: 30.0 })
  percentage: number;
}

export class ReturnByCategoryDto {
  @ApiProperty({ description: 'Tên danh mục', example: 'Áo' })
  categoryName: string;

  @ApiProperty({ description: 'Số lượng sản phẩm trả', example: 80 })
  productsReturned: number;

  @ApiProperty({ description: 'Số tiền hoàn trả (VNĐ)', example: 5000000 })
  refundAmount: number;

  @ApiProperty({ description: 'Tỷ lệ trả hàng (%)', example: 15.5 })
  returnRate: number;
}

export class TopReturnCustomerDto {
  @ApiProperty({ description: 'ID khách hàng', example: '507f1f77bcf86cd799439011' })
  customerId: string;

  @ApiProperty({ description: 'Tên khách hàng', example: 'Nguyễn Văn A' })
  customerName: string;

  @ApiProperty({ description: 'Email khách hàng', example: 'nguyenvana@example.com' })
  email: string;

  @ApiProperty({ description: 'Số yêu cầu trả hàng', example: 5 })
  returnCount: number;

  @ApiProperty({ description: 'Tổng tiền hoàn trả (VNĐ)', example: 2000000 })
  totalRefundAmount: number;
}

export class ReturnByTimeDto {
  @ApiProperty({ description: 'Thời gian', example: '2024-01' })
  timePeriod: string;

  @ApiProperty({ description: 'Số yêu cầu trả hàng', example: 25 })
  returnCount: number;

  @ApiProperty({ description: 'Số tiền hoàn trả (VNĐ)', example: 3000000 })
  refundAmount: number;

  @ApiProperty({ description: 'Số sản phẩm trả', example: 40 })
  productsReturned: number;
}

export class ReturnOrderDashboardDto {
  @ApiProperty({ description: 'Tổng yêu cầu trả hàng hôm nay', example: 5 })
  todayReturns: number;

  @ApiProperty({ description: 'Tổng yêu cầu trả hàng hôm qua', example: 8 })
  yesterdayReturns: number;

  @ApiProperty({ description: 'Tổng yêu cầu trả hàng tháng này', example: 120 })
  thisMonthReturns: number;

  @ApiProperty({ description: 'Tổng yêu cầu trả hàng tháng trước', example: 95 })
  lastMonthReturns: number;

  @ApiProperty({ description: 'Tổng tiền hoàn trả hôm nay (VNĐ)', example: 500000 })
  todayRefundAmount: number;

  @ApiProperty({ description: 'Tổng tiền hoàn trả hôm qua (VNĐ)', example: 800000 })
  yesterdayRefundAmount: number;

  @ApiProperty({ description: 'Tổng tiền hoàn trả tháng này (VNĐ)', example: 15000000 })
  thisMonthRefundAmount: number;

  @ApiProperty({ description: 'Tổng tiền hoàn trả tháng trước (VNĐ)', example: 12000000 })
  lastMonthRefundAmount: number;

  @ApiProperty({ description: 'Tỷ lệ chấp nhận trả hàng (%)', example: 85.5 })
  approvalRate: number;

  @ApiProperty({ 
    description: 'Thống kê trạng thái hôm nay',
    example: {
      pending: 2,
      approved: 3,
      rejected: 0,
      processing: 1,
      completed: 2
    }
  })
  todayStatusStats: {
    pending: number;
    approved: number;
    rejected: number;
    processing: number;
    completed: number;
  };
}
