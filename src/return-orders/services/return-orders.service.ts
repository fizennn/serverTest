import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ReturnOrder,
  ReturnOrderDocument,
} from '../schemas/return-order.schema';
import {
  ReturnOrderDto,
  UpdateReturnStatusDto,
} from '../dtos/return-order.dto';
import { Order, OrderWithTimestamps } from '@/orders/schemas/order.schema';
import { Product } from '@/products/schemas/product.schema';
import { User } from '@/users/schemas/user.schema';

@Injectable()
export class ReturnOrdersService {
  constructor(
    @InjectModel(ReturnOrder.name) private returnOrderModel: Model<ReturnOrder>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async createReturnRequest(
    orderId: string,
    returnOrderDto: ReturnOrderDto,
    userId: string,
  ): Promise<ReturnOrderDocument> {
    const order = (await this.orderModel
      .findById(orderId)
      .populate('items.product', 'name price')
      .exec()) as unknown as OrderWithTimestamps;

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.idUser.toString() !== userId) {
      throw new ForbiddenException('Không có quyền trả hàng đơn hàng này');
    }

    if (order.status !== 'delivered') {
      throw new BadRequestException(
        'Chỉ có thể trả hàng với đơn hàng đã giao thành công',
      );
    }

    const deliveryDate = order.updatedAt || order.createdAt;
    const daysDifference = Math.floor(
      (Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDifference > 7) {
      throw new BadRequestException('Đã quá thời hạn trả hàng (7 ngày)');
    }

    const existingReturn = await this.returnOrderModel.findOne({ orderId });
    if (existingReturn) {
      throw new BadRequestException('Đơn hàng này đã có yêu cầu trả hàng');
    }

    const returnItems = [];
    let totalRefundAmount = 0;

    for (const returnItem of returnOrderDto.items) {
      const orderItem = order.items.find(
        item => item.product._id.toString() === returnItem.productId,
      );

      if (!orderItem) {
        throw new BadRequestException(
          `Sản phẩm ${returnItem.productId} không có trong đơn hàng`,
        );
      }

      if (returnItem.quantity > orderItem.quantity) {
        const productInfo = orderItem.product as any;
        const productName = productInfo.name || 'Sản phẩm';
        throw new BadRequestException(
          `Không thể trả ${returnItem.quantity} sản phẩm ${productName}. Chỉ mua ${orderItem.quantity}`,
        );
      }

      const totalPrice = orderItem.price * returnItem.quantity;
      totalRefundAmount += totalPrice;

      returnItems.push({
        productId: new Types.ObjectId(returnItem.productId),
        quantity: returnItem.quantity,
        unitPrice: orderItem.price,
        totalPrice: totalPrice,
        variant: orderItem.variant || '',
      });
    }

    const returnOrder = await this.returnOrderModel.create({
      orderId: new Types.ObjectId(orderId),
      customerId: new Types.ObjectId(userId),
      reason: returnOrderDto.reason,
      description: returnOrderDto.description,
      items: returnItems,
      totalRefundAmount,
      status: 'pending',
      images: returnOrderDto.images || [],
    });

    const populatedReturn = await this.returnOrderModel
      .findById(returnOrder._id)
      .populate('orderId', 'total createdAt status')
      .populate('customerId', 'name email')
      .populate('items.productId', 'name images')
      .exec();

    return populatedReturn;
  }

  async getReturnRequest(orderId: string): Promise<ReturnOrderDocument> {
    const returnRequest = await this.returnOrderModel
      .findOne({ orderId })
      .populate('orderId', 'total createdAt status')
      .populate('customerId', 'name email')
      .populate('items.productId', 'name images')
      .exec();

    if (!returnRequest) {
      throw new NotFoundException('Không tìm thấy yêu cầu trả hàng');
    }

    return returnRequest;
  }

  async getReturnRequestById(returnId: string): Promise<ReturnOrderDocument> {
    if (!Types.ObjectId.isValid(returnId)) {
      throw new BadRequestException('ID yêu cầu trả hàng không hợp lệ');
    }

    const returnRequest = await this.returnOrderModel
      .findById(returnId)
      .populate('orderId', 'total createdAt status')
      .populate('customerId', 'name email')
      .populate('items.productId', 'name images')
      .exec();

    if (!returnRequest) {
      throw new NotFoundException('Không tìm thấy yêu cầu trả hàng');
    }

    return returnRequest;
  }

  async getCustomerReturnRequests(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: ReturnOrderDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    console.log('Searching for return orders with userId:', userId);
    console.log('userId type:', typeof userId);

    // Validate userId format
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('User ID không hợp lệ');
    }

    // Check if userId is a valid ObjectId
    if (!Types.ObjectId.isValid(userId)) {
      console.log('Invalid ObjectId format for userId:', userId);
      throw new BadRequestException('ID yêu cầu trả hàng không hợp lệ');
    }

    // Convert userId to ObjectId for proper comparison
    const userObjectId = new Types.ObjectId(userId);

    console.log('Converted userObjectId:', userObjectId);

    const [data, total] = await Promise.all([
      this.returnOrderModel
        .find({ customerId: userObjectId })
        .populate('orderId', 'total createdAt status')
        .populate('items.productId', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.returnOrderModel.countDocuments({ customerId: userObjectId }),
    ]);

    console.log('Found return orders:', data.length);
    console.log('Total count:', total);

    return {
      data,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async getAllReturnRequests(
    page = 1,
    limit = 10,
    status?: string,
  ): Promise<{ data: ReturnOrderDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const filter = status ? { status } : {};

    const [data, total] = await Promise.all([
      this.returnOrderModel
        .find(filter)
        .populate('orderId', 'total createdAt status')
        .populate('customerId', 'name email')
        .populate('items.productId', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.returnOrderModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async debugAllReturns(): Promise<any> {
    const allReturns = await this.returnOrderModel
      .find({})
      .populate('customerId', 'name email _id')
      .populate('orderId', 'total createdAt status _id')
      .exec();

    console.log('All return orders in database:', allReturns.length);
    console.log('Return orders data:', JSON.stringify(allReturns, null, 2));

    return {
      total: allReturns.length,
      data: allReturns,
    };
  }

  async updateReturnStatus(
    returnId: string,
    updateData: UpdateReturnStatusDto,
  ): Promise<ReturnOrderDocument> {
    if (!Types.ObjectId.isValid(returnId)) {
      throw new BadRequestException('ID yêu cầu trả hàng không hợp lệ');
    }

    const returnRequest = await this.returnOrderModel
      .findById(returnId)
      .populate('orderId')
      .exec();

    if (!returnRequest) {
      throw new NotFoundException('Không tìm thấy yêu cầu trả hàng');
    }

    if (
      returnRequest.status === 'completed' ||
      returnRequest.status === 'rejected'
    ) {
      throw new BadRequestException(
        'Không thể thay đổi trạng thái yêu cầu đã hoàn thành hoặc đã từ chối',
      );
    }

    returnRequest.status = updateData.status;
    returnRequest.adminNote = updateData.adminNote;
    returnRequest.processedAt = new Date();

    if (updateData.status === 'approved') {
      console.log(
        `Đã chấp nhận trả hàng với số tiền: ${returnRequest.totalRefundAmount}`,
      );
    } else if (updateData.status === 'completed') {
      await this.restoreProductStock(returnRequest);
      console.log('Đã hoàn thành trả hàng và cập nhật tồn kho');
    } else if (updateData.status === 'rejected') {
      console.log('Đã từ chối yêu cầu trả hàng');
    }

    await returnRequest.save();

    const populatedReturn = await this.returnOrderModel
      .findById(returnRequest._id)
      .populate('orderId', 'total createdAt status')
      .populate('customerId', 'name email')
      .populate('items.productId', 'name images')
      .exec();

    return populatedReturn;
  }

  async deleteReturnRequest(returnId: string): Promise<void> {
    if (!Types.ObjectId.isValid(returnId)) {
      throw new BadRequestException('ID yêu cầu trả hàng không hợp lệ');
    }

    const returnRequest = await this.returnOrderModel.findById(returnId);
    if (!returnRequest) {
      throw new NotFoundException('Không tìm thấy yêu cầu trả hàng');
    }

    if (returnRequest.status !== 'pending') {
      throw new BadRequestException(
        'Chỉ có thể xóa yêu cầu trả hàng đang chờ xử lý',
      );
    }

    await this.returnOrderModel.findByIdAndDelete(returnId);
  }

  private async restoreProductStock(
    returnRequest: ReturnOrderDocument,
  ): Promise<void> {
    for (const item of returnRequest.items) {
      const product = await this.productModel.findById(item.productId);
      if (product) {
        product.countInStock += item.quantity;

        if (item.variant) {
          for (const variant of product.variants) {
            for (const size of variant.sizes) {
              if (
                `${product.name} - ${variant.color} - ${size.size}` ===
                item.variant
              ) {
                size.stock += item.quantity;
                break;
              }
            }
          }
        }

        await product.save();
      }
    }
  }

  async getReturnStatistics(dateRange?: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    const matchCondition: any = {};

    if (dateRange?.startDate || dateRange?.endDate) {
      matchCondition.createdAt = {};
      if (dateRange.startDate) {
        matchCondition.createdAt.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        matchCondition.createdAt.$lte = new Date(
          dateRange.endDate + 'T23:59:59.999Z',
        );
      }
    }

    const [statusStats, totalStats] = await Promise.all([
      this.returnOrderModel.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalRefundAmount: { $sum: '$totalRefundAmount' },
          },
        },
      ]),
      this.returnOrderModel.aggregate([
        { $match: matchCondition },
        {
          $group: {
            _id: null,
            totalReturns: { $sum: 1 },
            totalRefundAmount: { $sum: '$totalRefundAmount' },
            averageRefundAmount: { $avg: '$totalRefundAmount' },
          },
        },
      ]),
    ]);

    return {
      statusStats,
      totalStats: totalStats[0] || {
        totalReturns: 0,
        totalRefundAmount: 0,
        averageRefundAmount: 0,
      },
    };
  }
}
