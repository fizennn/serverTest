// analytics/services/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

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
  RevenueByTimeDto,
} from './dto/analytics.dto';
import { Order } from '@/orders/schemas/order.schema';
import { Product } from '@/products/schemas/product.schema';
import { User } from '@/users/schemas/user.schema';
import { Category } from '@/category/schemas/category.schema';
import { Voucher } from '@/vouchers/schemas/voucher.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
    @InjectModel(Voucher.name) private voucherModel: Model<Voucher>,
  ) {}

  async getOrderOverview(
    dateRange?: DateRangeQueryDto,
  ): Promise<OrderOverviewDto> {
    const matchCondition = this.buildDateFilter(dateRange);

    const [overviewStats] = await this.orderModel.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          successfulOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0],
            },
          },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0],
            },
          },
          totalProductsSold: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'delivered'] },
                { $sum: '$items.quantity' },
                0,
              ],
            },
          },
          totalRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'delivered'] }, '$total', 0],
            },
          },
        },
      },
    ]);

    // Thống kê theo từng trạng thái
    const statusStats = await this.orderModel.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Chuyển đổi thành object
    const orderStatusStats = {
      pending: 0,
      confirmed: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
      'return-pending': 0,
      'return-approved': 0,
      'return-processing': 0,
      'return-completed': 0,
      'return-rejected': 0,
    };

    statusStats.forEach(stat => {
      if (orderStatusStats.hasOwnProperty(stat._id)) {
        orderStatusStats[stat._id] = stat.count;
      }
    });

    if (!overviewStats) {
      return {
        totalOrders: 0,
        successfulOrders: 0,
        cancelledOrders: 0,
        totalProductsSold: 0,
        totalRevenue: 0,
        cashPayment: 0,
        bankTransfer: 0,
        successRate: 0,
        orderStatusStats,
      };
    }

    const successRate =
      overviewStats.totalOrders > 0
        ? (overviewStats.successfulOrders / overviewStats.totalOrders) * 100
        : 0;

    // Lấy thống kê thanh toán
    const paymentStats = await this.getPaymentMethodStats(dateRange);
    const cashPayment = paymentStats.find(stat => stat.paymentMethod === 'COD')?.revenue || 0;
    const bankTransfer = paymentStats.find(stat => stat.paymentMethod === 'BANK_TRANSFER')?.revenue || 0;

    return {
      ...overviewStats,
      cashPayment,
      bankTransfer,
      successRate: Math.round(successRate * 100) / 100,
      orderStatusStats,
    };
  }

  async getTopProducts(
    limit: number = 3,
    dateRange?: DateRangeQueryDto,
  ): Promise<TopProductDto[]> {
    const matchCondition = {
      ...this.buildDateFilter(dateRange),
      status: 'delivered',
    };

    return await this.orderModel.aggregate([
      { $match: matchCondition },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          soldQuantity: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          productId: '$_id',
          productName: '$product.name',
          image: { $arrayElemAt: ['$product.images', 0] },
          soldQuantity: 1,
          revenue: 1,
          category: '$category.name',
        },
      },
    ]);
  }

  async getRevenueByCategory(
    dateRange?: DateRangeQueryDto,
  ): Promise<RevenueByCategoryDto[]> {
    const matchCondition = {
      ...this.buildDateFilter(dateRange),
      status: 'delivered',
    };

    const categoryRevenue = await this.orderModel.aggregate([
      { $match: matchCondition },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          productsSold: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    const totalRevenue = categoryRevenue.reduce(
      (sum, cat) => sum + cat.revenue,
      0,
    );

    return categoryRevenue.map(cat => ({
      categoryName: cat.categoryName,
      revenue: cat.revenue,
      productsSold: cat.productsSold,
      percentage:
        totalRevenue > 0
          ? Math.round((cat.revenue / totalRevenue) * 10000) / 100
          : 0,
    }));
  }
  async getLowStockProducts(
    threshold: number = 10,
  ): Promise<LowStockProductDto[]> {
    const products = await this.productModel.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $addFields: {
          lowStockVariants: {
            $filter: {
              input: {
                $reduce: {
                  input: '$variants',
                  initialValue: [],
                  in: {
                    $concatArrays: [
                      '$$value',
                      {
                        $map: {
                          input: '$$this.sizes',
                          as: 'sizeItem', // Add alias for the size item
                          in: {
                            color: '$$this.color',
                            size: '$$sizeItem.size', // Use the alias
                            stock: '$$sizeItem.stock', // Use the alias
                          },
                        },
                      },
                    ],
                  },
                },
              },
              as: 'variant', // Add alias for the variant item
              cond: { $lte: ['$$variant.stock', threshold] }, // Use the alias
            },
          },
        },
      },
      {
        $match: {
          $or: [
            { countInStock: { $lte: threshold } },
            { 'lowStockVariants.0': { $exists: true } },
          ],
        },
      },
      {
        $project: {
          productId: '$_id',
          productName: '$name',
          image: { $arrayElemAt: ['$images', 0] },
          currentStock: '$countInStock',
          category: '$category.name',
          lowStockVariants: 1,
        },
      },
      { $sort: { currentStock: 1 } },
    ]);

    return products;
  }

  async getTopCustomers(
    limit: number = 10,
    dateRange?: DateRangeQueryDto,
  ): Promise<TopCustomerDto[]> {
    const matchCondition = {
      ...this.buildDateFilter(dateRange),
      status: 'delivered',
    };

    return await this.orderModel.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$idUser',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' },
        },
      },
      {
        $addFields: {
          averageOrderValue: { $divide: ['$totalSpent', '$orderCount'] },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          customerId: '$_id',
          customerName: '$user.name',
          email: '$user.email',
          orderCount: 1,
          totalSpent: 1,
          averageOrderValue: { $round: ['$averageOrderValue', 0] },
        },
      },
    ]);
  }

  async getPaymentMethodStats(
    dateRange?: DateRangeQueryDto,
  ): Promise<PaymentMethodStatsDto[]> {
    const matchCondition = {
      ...this.buildDateFilter(dateRange),
      status: 'delivered',
    };

    const stats = await this.orderModel.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$payment',
          orderCount: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { orderCount: -1 } },
    ]);

    const totalOrders = stats.reduce((sum, stat) => sum + stat.orderCount, 0);

    return stats.map(stat => ({
      paymentMethod: stat._id,
      orderCount: stat.orderCount,
      revenue: stat.revenue,
      percentage:
        totalOrders > 0
          ? Math.round((stat.orderCount / totalOrders) * 10000) / 100
          : 0,
    }));
  }

  async getVoucherUsageStats(
    dateRange?: DateRangeQueryDto,
  ): Promise<VoucherUsageDto[]> {
    const matchCondition = {
      ...this.buildDateFilter(dateRange),
      status: 'delivered',
      'vouchers.0': { $exists: true },
    };

    return await this.orderModel.aggregate([
      { $match: matchCondition },
      { $unwind: '$vouchers' },
      {
        $group: {
          _id: '$vouchers.voucherId',
          type: { $first: '$vouchers.type' },
          discount: { $first: '$vouchers.disCount' },
          usageCount: { $sum: 1 },
          totalDiscountAmount: { $sum: '$vouchers.appliedDiscount' },
          revenueFromVoucherOrders: { $sum: '$total' },
        },
      },
      { $sort: { usageCount: -1 } },
      {
        $project: {
          voucherId: '$_id',
          type: 1,
          discount: 1,
          usageCount: 1,
          totalDiscountAmount: 1,
          revenueFromVoucherOrders: 1,
        },
      },
    ]);
  }

  private buildDateFilter(dateRange?: DateRangeQueryDto): any {
    if (!dateRange?.startDate && !dateRange?.endDate) {
      return {};
    }

    const filter: any = {};
    if (dateRange.startDate || dateRange.endDate) {
      filter.createdAt = {};
      if (dateRange.startDate) {
        filter.createdAt.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        filter.createdAt.$lte = new Date(dateRange.endDate + 'T23:59:59.999Z');
      }
    }
    return filter;
  }

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Thống kê hôm nay
    const todayStats = await this.getDailyStats(today);
    
    // Thống kê hôm qua
    const yesterdayStats = await this.getDailyStats(yesterday);
    
    // Thống kê tháng này
    const thisMonthStats = await this.getMonthlyStats(thisMonth, today);
    
    // Thống kê tháng trước
    const lastMonthStats = await this.getMonthlyStats(lastMonth, lastMonthEnd);

    // Tổng số đơn hàng theo trạng thái
    const orderStatusCounts = await this.getOrderStatusCounts();

    // Doanh thu theo tháng trong năm
    const monthlyRevenue = await this.getMonthlyRevenueByYear(today.getFullYear());

    // Top sản phẩm bán chạy
    const topProducts = await this.getTopProducts(5);

    return {
      todayStats,
      yesterdayStats,
      thisMonthStats,
      lastMonthStats,
      totalOrders: orderStatusCounts.totalOrders,
      pendingOrders: orderStatusCounts.pendingOrders,
      processingOrders: orderStatusCounts.processingOrders,
      deliveredOrders: orderStatusCounts.deliveredOrders,
      monthlyRevenue,
      topProducts,
    };
  }

  private async getDailyStats(date: Date): Promise<{
    totalRevenue: number;
    cashPayment: number;
    bankTransfer: number;
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const stats = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          status: 'delivered',
        },
      },
      {
        $group: {
          _id: '$payment',
          revenue: { $sum: '$total' },
        },
      },
    ]);

    let totalRevenue = 0;
    let cashPayment = 0;
    let bankTransfer = 0;

    stats.forEach(stat => {
      totalRevenue += stat.revenue;
      if (stat._id === 'COD') {
        cashPayment = stat.revenue;
      } else {
        bankTransfer += stat.revenue;
      }
    });

    return {
      totalRevenue,
      cashPayment,
      bankTransfer,
    };
  }

  private async getMonthlyStats(startDate: Date, endDate: Date): Promise<{
    totalRevenue: number;
    cashPayment: number;
    bankTransfer: number;
  }> {
    const stats = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'delivered',
        },
      },
      {
        $group: {
          _id: '$payment',
          revenue: { $sum: '$total' },
        },
      },
    ]);

    let totalRevenue = 0;
    let cashPayment = 0;
    let bankTransfer = 0;

    stats.forEach(stat => {
      totalRevenue += stat.revenue;
      if (stat._id === 'COD') {
        cashPayment = stat.revenue;
      } else {
        bankTransfer += stat.revenue;
      }
    });

    return {
      totalRevenue,
      cashPayment,
      bankTransfer,
    };
  }

  private async getOrderStatusCounts(): Promise<{
    totalOrders: number;
    pendingOrders: number;
    processingOrders: number;
    deliveredOrders: number;
  }> {
    const stats = await this.orderModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    let totalOrders = 0;
    let pendingOrders = 0;
    let processingOrders = 0;
    let deliveredOrders = 0;

    stats.forEach(stat => {
      totalOrders += stat.count;
      switch (stat._id) {
        case 'pending':
          pendingOrders = stat.count;
          break;
        case 'confirmed':
        case 'shipping':
          processingOrders += stat.count;
          break;
        case 'delivered':
          deliveredOrders = stat.count;
          break;
      }
    });

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
    };
  }

  private async getMonthlyRevenueByYear(year: number): Promise<{
    [key: string]: number;
  }> {
    const monthlyRevenue = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(year, 0, 1),
            $lte: new Date(year, 11, 31, 23, 59, 59, 999),
          },
          status: 'delivered',
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const result: { [key: string]: number } = {};
    
    // Khởi tạo tất cả tháng với giá trị 0
    for (let i = 1; i <= 12; i++) {
      result[i.toString()] = 0;
    }

    // Cập nhật doanh thu thực tế
    monthlyRevenue.forEach(stat => {
      result[stat._id.toString()] = stat.revenue;
    });

    return result;
  }

  async getRevenueByTime(
    dateRange?: DateRangeQueryDto,
    timeType: 'day' | 'month' | 'year' = 'month',
  ): Promise<RevenueByTimeDto[]> {
    const matchCondition = {
      ...this.buildDateFilter(dateRange),
      status: 'delivered',
    };

    let groupBy: any;
    let dateFormat: string;

    switch (timeType) {
      case 'day':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        dateFormat = '%Y-%m-%d';
        break;
      case 'month':
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        dateFormat = '%Y-%m';
        break;
      case 'year':
        groupBy = {
          year: { $year: '$createdAt' },
        };
        dateFormat = '%Y';
        break;
      default:
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        dateFormat = '%Y-%m';
    }

    const revenueStats = await this.orderModel.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          period: {
            $dateToString: {
              format: dateFormat,
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: { $ifNull: ['$_id.month', 1] },
                  day: { $ifNull: ['$_id.day', 1] },
                },
              },
            },
          },
        },
      },
      { $sort: { period: 1 } },
      {
        $project: {
          _id: 0,
          period: 1,
          revenue: 1,
          orderCount: 1,
        },
      },
    ]);

    return revenueStats;
  }
}
