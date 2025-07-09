// analytics/services/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

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

    if (!overviewStats) {
      return {
        totalOrders: 0,
        successfulOrders: 0,
        cancelledOrders: 0,
        totalProductsSold: 0,
        totalRevenue: 0,
        successRate: 0,
      };
    }

    const successRate =
      overviewStats.totalOrders > 0
        ? (overviewStats.successfulOrders / overviewStats.totalOrders) * 100
        : 0;

    return {
      ...overviewStats,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  async getRevenueByTime(
    dateRange?: DateRangeQueryDto,
  ): Promise<RevenueByTimeDto[]> {
    const matchCondition = {
      ...this.buildDateFilter(dateRange),
      status: 'delivered',
    };

    const timeType = dateRange?.timeType || 'month';
    let groupFormat: any;
    let sortFormat: string;

    switch (timeType) {
      case 'day':
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        sortFormat = '%Y-%m-%d';
        break;
      case 'year':
        groupFormat = {
          year: { $year: '$createdAt' },
        };
        sortFormat = '%Y';
        break;
      default: // month
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        sortFormat = '%Y-%m';
    }

    return await this.orderModel.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: groupFormat,
          revenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $addFields: {
          period: {
            $dateToString: {
              format: sortFormat,
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
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      {
        $project: {
          _id: 0,
          period: 1,
          revenue: 1,
          orderCount: 1,
        },
      },
    ]);
  }

  async getTopProducts(limit: number = 3): Promise<TopProductDto[]> {
    return await this.orderModel.aggregate([
      { $match: { status: 'delivered' } },
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

  async getRevenueByCategory(): Promise<RevenueByCategoryDto[]> {
    const categoryRevenue = await this.orderModel.aggregate([
      { $match: { status: 'delivered' } },
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
                          in: {
                            color: '$$this.color',
                            size: '$$item.size',
                            stock: '$$item.stock',
                          },
                        },
                      },
                    ],
                  },
                },
              },
              cond: { $lte: ['$$item.stock', threshold] },
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

  async getTopCustomers(limit: number = 10): Promise<TopCustomerDto[]> {
    return await this.orderModel.aggregate([
      { $match: { status: 'delivered' } },
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

  async getPaymentMethodStats(): Promise<PaymentMethodStatsDto[]> {
    const stats = await this.orderModel.aggregate([
      { $match: { status: 'delivered' } },
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

  async getVoucherUsageStats(): Promise<VoucherUsageDto[]> {
    return await this.orderModel.aggregate([
      { $match: { status: 'delivered', 'vouchers.0': { $exists: true } } },
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
}
