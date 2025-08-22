// return-orders/services/return-order-analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  ReturnOrderOverviewDto,
  TopReturnReasonDto,
  ReturnByCategoryDto,
  TopReturnCustomerDto,
  ReturnByTimeDto,
  ReturnOrderDashboardDto,
  DateRangeQueryDto,
} from '../dtos/return-order-analytics.dto';
import { ReturnOrder } from '../schemas/return-order.schema';
import { Product } from '@/products/schemas/product.schema';
import { User } from '@/users/schemas/user.schema';
import { Category } from '@/category/schemas/category.schema';

@Injectable()
export class ReturnOrderAnalyticsService {
  constructor(
    @InjectModel(ReturnOrder.name) private returnOrderModel: Model<ReturnOrder>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  private buildDateFilter(dateRange?: DateRangeQueryDto) {
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

  async getReturnOrderOverview(
    dateRange?: DateRangeQueryDto,
  ): Promise<ReturnOrderOverviewDto> {
    const matchCondition = this.buildDateFilter(dateRange);

    const [overviewStats] = await this.returnOrderModel.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalReturnRequests: { $sum: 1 },
          approvedReturns: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, 1, 0],
            },
          },
          rejectedReturns: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0],
            },
          },
          processingReturns: {
            $sum: {
              $cond: [{ $eq: ['$status', 'processing'] }, 1, 0],
            },
          },
          completedReturns: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
            },
          },
          totalProductsReturned: {
            $sum: {
              $cond: [
                { $in: ['$status', ['approved', 'processing', 'completed']] },
                { $sum: '$items.quantity' },
                0,
              ],
            },
          },
          totalRefundAmount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['approved', 'processing', 'completed']] },
                '$totalRefundAmount',
                0,
              ],
            },
          },
        },
      },
    ]);

    // Thống kê theo từng trạng thái
    const statusStats = await this.returnOrderModel.aggregate([
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
    const returnStatusStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      processing: 0,
      completed: 0,
    };

    statusStats.forEach(stat => {
      if (returnStatusStats.hasOwnProperty(stat._id)) {
        returnStatusStats[stat._id] = stat.count;
      }
    });

    if (!overviewStats) {
      return {
        totalReturnRequests: 0,
        approvedReturns: 0,
        rejectedReturns: 0,
        processingReturns: 0,
        completedReturns: 0,
        totalProductsReturned: 0,
        totalRefundAmount: 0,
        approvalRate: 0,
        returnStatusStats,
      };
    }

    const approvalRate =
      overviewStats.totalReturnRequests > 0
        ? (overviewStats.approvedReturns / overviewStats.totalReturnRequests) * 100
        : 0;

    return {
      ...overviewStats,
      approvalRate: Math.round(approvalRate * 100) / 100,
      returnStatusStats,
    };
  }

  async getTopReturnReasons(
    limit: number = 5,
    dateRange?: DateRangeQueryDto,
  ): Promise<TopReturnReasonDto[]> {
    const matchCondition = this.buildDateFilter(dateRange);

    const totalReturns = await this.returnOrderModel.countDocuments(matchCondition);

    const reasons = await this.returnOrderModel.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    return reasons.map(reason => ({
      reason: reason._id,
      count: reason.count,
      percentage: totalReturns > 0 ? Math.round((reason.count / totalReturns) * 100 * 100) / 100 : 0,
    }));
  }

  async getReturnByCategory(
    dateRange?: DateRangeQueryDto,
  ): Promise<ReturnByCategoryDto[]> {
    const matchCondition = this.buildDateFilter(dateRange);

    const categoryReturns = await this.returnOrderModel.aggregate([
      { $match: matchCondition },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
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
          _id: '$category.name',
          productsReturned: { $sum: '$items.quantity' },
          refundAmount: { $sum: '$items.totalPrice' },
        },
      },
      { $sort: { refundAmount: -1 } },
    ]);

    // Tính tổng sản phẩm đã bán để tính tỷ lệ trả hàng
    const totalSoldProducts = await this.productModel.aggregate([
      {
        $group: {
          _id: null,
          totalSold: { $sum: '$sold' },
        },
      },
    ]);

    const totalSold = totalSoldProducts.length > 0 ? totalSoldProducts[0].totalSold : 0;

    return categoryReturns.map(cat => ({
      categoryName: cat._id,
      productsReturned: cat.productsReturned,
      refundAmount: cat.refundAmount,
      returnRate: totalSold > 0 ? Math.round((cat.productsReturned / totalSold) * 100 * 100) / 100 : 0,
    }));
  }

  async getTopReturnCustomers(
    limit: number = 10,
    dateRange?: DateRangeQueryDto,
  ): Promise<TopReturnCustomerDto[]> {
    const matchCondition = this.buildDateFilter(dateRange);

    return await this.returnOrderModel.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$customerId',
          returnCount: { $sum: 1 },
          totalRefundAmount: { $sum: '$totalRefundAmount' },
        },
      },
      { $sort: { returnCount: -1, totalRefundAmount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      { $unwind: '$customer' },
      {
        $project: {
          customerId: '$_id',
          customerName: '$customer.fullName',
          email: '$customer.email',
          returnCount: 1,
          totalRefundAmount: 1,
        },
      },
    ]);
  }

  async getReturnByTime(
    dateRange?: DateRangeQueryDto,
    timeType: 'day' | 'month' | 'year' = 'month',
  ): Promise<ReturnByTimeDto[]> {
    const matchCondition = this.buildDateFilter(dateRange);

    let dateFormat: string;
    let groupFormat: string;

    switch (timeType) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        groupFormat = '%Y-%m-%d';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        groupFormat = '%Y-%m';
        break;
      case 'year':
        dateFormat = '%Y';
        groupFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m';
        groupFormat = '%Y-%m';
    }

    return await this.returnOrderModel.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: {
            $dateToString: {
              format: groupFormat,
              date: '$createdAt',
            },
          },
          returnCount: { $sum: 1 },
          refundAmount: { $sum: '$totalRefundAmount' },
          productsReturned: {
            $sum: { $sum: '$items.quantity' },
          },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          timePeriod: '$_id',
          returnCount: 1,
          refundAmount: 1,
          productsReturned: 1,
        },
      },
    ]);
  }

  async getReturnOrderDashboard(): Promise<ReturnOrderDashboardDto> {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Thống kê hôm nay
    const todayStats = await this.returnOrderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          refundAmount: { $sum: '$totalRefundAmount' },
        },
      },
    ]);

    // Thống kê hôm qua
    const yesterdayStats = await this.returnOrderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()),
            $lt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() + 1),
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          refundAmount: { $sum: '$totalRefundAmount' },
        },
      },
    ]);

    // Thống kê tháng này
    const thisMonthStats = await this.returnOrderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: thisMonth },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          refundAmount: { $sum: '$totalRefundAmount' },
        },
      },
    ]);

    // Thống kê tháng trước
    const lastMonthStats = await this.returnOrderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: lastMonth,
            $lt: thisMonth,
          },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          refundAmount: { $sum: '$totalRefundAmount' },
        },
      },
    ]);

    // Thống kê trạng thái hôm nay
    const todayStatusStats = await this.returnOrderModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
            $lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
          },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const todayStatusStatsObj = {
      pending: 0,
      approved: 0,
      rejected: 0,
      processing: 0,
      completed: 0,
    };

    todayStatusStats.forEach(stat => {
      if (todayStatusStatsObj.hasOwnProperty(stat._id)) {
        todayStatusStatsObj[stat._id] = stat.count;
      }
    });

    // Tính tỷ lệ chấp nhận tổng thể
    const totalApprovalStats = await this.returnOrderModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, 1, 0],
            },
          },
        },
      },
    ]);

    const approvalRate = totalApprovalStats.length > 0 && totalApprovalStats[0].total > 0
      ? Math.round((totalApprovalStats[0].approved / totalApprovalStats[0].total) * 100 * 100) / 100
      : 0;

    return {
      todayReturns: todayStats.length > 0 ? todayStats[0].count : 0,
      yesterdayReturns: yesterdayStats.length > 0 ? yesterdayStats[0].count : 0,
      thisMonthReturns: thisMonthStats.length > 0 ? thisMonthStats[0].count : 0,
      lastMonthReturns: lastMonthStats.length > 0 ? lastMonthStats[0].count : 0,
      todayRefundAmount: todayStats.length > 0 ? todayStats[0].refundAmount : 0,
      yesterdayRefundAmount: yesterdayStats.length > 0 ? yesterdayStats[0].refundAmount : 0,
      thisMonthRefundAmount: thisMonthStats.length > 0 ? thisMonthStats[0].refundAmount : 0,
      lastMonthRefundAmount: lastMonthStats.length > 0 ? lastMonthStats[0].refundAmount : 0,
      approvalRate,
      todayStatusStats: todayStatusStatsObj,
    };
  }
}
