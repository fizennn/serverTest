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
import { NotificationService } from '@/notifications/notifications.service';
import { VoucherRefundService } from '@/vouchers/services/voucher-refund.service';

@Injectable()
export class ReturnOrdersService {
  constructor(
    @InjectModel(ReturnOrder.name) private returnOrderModel: Model<ReturnOrder>,
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(User.name) private userModel: Model<User>,
    private notificationService: NotificationService,
    private voucherRefundService: VoucherRefundService,
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

    if (order.status !== 'delivered' && !order.status.startsWith('return-')) {
      throw new BadRequestException(
        'Chỉ có thể trả hàng với đơn hàng đã giao thành công hoặc đang trong quá trình trả hàng',
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
      console.log('=== DEBUG ITEM ID COMPARISON ===');
      console.log('ReturnItem itemId:', returnItem.itemId);
      console.log('ReturnItem productId:', returnItem.productId);
      
      console.log('Order items:');
      order.items.forEach((item, index) => {
        console.log(`Item ${index}:`, {
          itemId: item._id?.toString(),
          productId: item.product._id.toString(),
          status: item.status
        });
      });
      
      // Tìm item theo itemId thay vì productId
      const orderItemIndex = order.items.findIndex(
        item => item._id?.toString() === returnItem.itemId,
      );

      if (orderItemIndex === -1) {
        throw new BadRequestException(
          `Item ${returnItem.itemId} không có trong đơn hàng`,
        );
      }

      const orderItem = order.items[orderItemIndex];

      // Kiểm tra xem productId có khớp không
      if (orderItem.product._id.toString() !== returnItem.productId) {
        throw new BadRequestException(
          `ProductId ${returnItem.productId} không khớp với item ${returnItem.itemId}`,
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
        itemId: new Types.ObjectId(returnItem.itemId),
        quantity: returnItem.quantity,
        unitPrice: orderItem.price,
        totalPrice: totalPrice,
        variant: orderItem.variant || '',
      });

      // Cập nhật status của item trong order thành 'return'
      console.log(`Updating item ${returnItem.itemId} status to return`);
      console.log('Original item status:', order.items[orderItemIndex].status);
      order.items[orderItemIndex].status = 'return';
      console.log('Updated item status:', order.items[orderItemIndex].status);
    }

    const returnOrder = await this.returnOrderModel.create({
      orderId: new Types.ObjectId(orderId),
      customerId: new Types.ObjectId(userId),
      reason: returnOrderDto.reason,
      description: returnOrderDto.description,
      items: returnItems,
      totalRefundAmount,
      status: 'pending',
      returnType: returnOrderDto.returnType || 'exchange',
      images: returnOrderDto.images || [],
      videoUrl: returnOrderDto.videoUrl,
    });

    // Cập nhật trạng thái đơn hàng gốc thành return và lưu thay đổi
    console.log('Updating order status to return');
    order.status = 'return';
    
    console.log('Before save - items status:', order.items.map(item => item.status));
    
    // Sử dụng save() method để đảm bảo thay đổi được lưu đúng cách
    await (order as any).save();
    
    console.log('Order saved successfully');
    console.log('After save - items status:', order.items.map(item => item.status));

    const populatedReturn = await this.returnOrderModel
      .findById(returnOrder._id)
      .populate('orderId', 'total createdAt status')
      .populate('customerId', 'name email')
      .populate('items.productId', 'name images')
      .exec();

    // Gửi thông báo cho user và admin khi tạo yêu cầu trả hàng
    await this.notificationService.sendAndSaveNotification(
      userId,
      null, // pushToken - sẽ được lấy từ user trong service
      'Yêu cầu trả hàng',
      `Yêu cầu trả hàng cho đơn hàng ${order._id} đã được tạo thành công`,
      'info',
      {
        type: 'return-order',
        returnOrderId: populatedReturn._id.toString(),
        orderId: order._id.toString(),
        action: 'created'
      }
    );

    await this.notificationService.sendNotificationToAdmins(
      'Yêu cầu trả hàng mới',
      `Có yêu cầu trả hàng mới cho đơn hàng ${order._id}`,
      'info',
      {
        type: 'return-order',
        returnOrderId: populatedReturn._id.toString(),
        orderId: order._id.toString(),
        action: 'created'
      }
    );

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
    returnType?: string,
  ): Promise<{ data: ReturnOrderDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    console.log('Searching for return orders with userId:', userId);
    console.log('userId type:', typeof userId);
    console.log('returnType filter:', returnType);

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

    // Tạo filter object
    const filter: any = { customerId: userObjectId };
    
    // Thêm filter theo returnType nếu có
    if (returnType) {
      filter.returnType = returnType;
    }

    console.log('Filter for customer return requests:', filter);

    const [data, total] = await Promise.all([
      this.returnOrderModel
        .find(filter)
        .populate('orderId', 'total createdAt status')
        .populate('items.productId', 'name images')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.returnOrderModel.countDocuments(filter),
    ]);

    console.log('Found return orders:', data.length);
    console.log('Total count:', total);
    console.log('Total type:', typeof total);
    console.log('Limit:', limit);
    console.log('Limit type:', typeof limit);

    // Đảm bảo total và limit là số hợp lệ
    const validTotal = typeof total === 'number' ? total : 0;
    const validLimit = typeof limit === 'number' && limit > 0 ? limit : 10;
    
    const calculatedPages = validLimit > 0 ? Math.ceil(validTotal / validLimit) : 0;

    console.log('Valid total:', validTotal);
    console.log('Valid limit:', validLimit);
    console.log('Calculated pages:', calculatedPages);
    console.log('Total / limit:', validTotal / validLimit);
    
    const result = {
      data,
      total: validTotal,
      pages: calculatedPages,
    };

    console.log('Return result:', JSON.stringify(result, null, 2));
    console.log('Result.pages:', result.pages);
    console.log('Result.pages type:', typeof result.pages);

    return result;
  }

  async getAllReturnRequests(
    page = 1,
    limit = 10,
    status?: string,
    returnType?: string,
  ): Promise<{ data: ReturnOrderDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const filter: any = {};

    // Thêm filter theo status nếu có
    if (status) {
      filter.status = status;
    }

    // Thêm filter theo returnType nếu có
    if (returnType) {
      filter.returnType = returnType;
    }

    console.log('Filter for getAllReturnRequests:', filter);

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

    console.log('Found return orders:', data.length);
    console.log('Total count:', total);

    // Đảm bảo total và limit là số hợp lệ
    const validTotal = typeof total === 'number' ? total : 0;
    const validLimit = typeof limit === 'number' && limit > 0 ? limit : 10;
    
    const calculatedPages = validLimit > 0 ? Math.ceil(validTotal / validLimit) : 0;
    
    const result = {
      data,
      total: validTotal,
      pages: calculatedPages,
    };

    console.log('Return result:', JSON.stringify(result, null, 2));

    return result;
  }

  async advancedSearchReturnOrders(
    searchDto: any,
  ): Promise<{ data: ReturnOrderDocument[]; total: number; pages: number }> {
    const {
      keyword,
      status,
      returnType,
      startDate,
      endDate,
      minRefundAmount,
      maxRefundAmount,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 10,
    } = searchDto;

    const skip = (page - 1) * limit;
    const filter: any = {};

    // Tìm kiếm theo từ khóa
    if (keyword) {
      const decodedKeyword = decodeURIComponent(keyword);
      
      // Kiểm tra xem keyword có phải là ObjectId hợp lệ không
      const isObjectId = Types.ObjectId.isValid(decodedKeyword);
      
      if (isObjectId) {
        // Nếu là ObjectId, tìm kiếm theo _id của return order hoặc orderId
        filter.$or = [
          { _id: new Types.ObjectId(decodedKeyword) },
          { orderId: new Types.ObjectId(decodedKeyword) }
        ];
      } else {
        // Nếu không phải ObjectId, tìm kiếm theo text
        const searchPattern = decodedKeyword
          .split(' ')
          .map(term => `(?=.*${term})`)
          .join('');
        
        // Tìm kiếm trong reason và description
        filter.$or = [
          { reason: { $regex: searchPattern, $options: 'i' } },
          { description: { $regex: searchPattern, $options: 'i' } }
        ];
      }
    }

    // Filter theo status
    if (status) {
      filter.status = status;
    }

    // Filter theo returnType
    if (returnType) {
      filter.returnType = returnType;
    }

    // Filter theo khoảng thời gian
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Filter theo khoảng tiền hoàn trả
    if (minRefundAmount !== undefined || maxRefundAmount !== undefined) {
      filter.totalRefundAmount = {};
      if (minRefundAmount !== undefined) {
        filter.totalRefundAmount.$gte = minRefundAmount;
      }
      if (maxRefundAmount !== undefined) {
        filter.totalRefundAmount.$lte = maxRefundAmount;
      }
    }

    console.log('Advanced search filter:', JSON.stringify(filter, null, 2));

    // Nếu có keyword và không phải ObjectId, cần tìm kiếm theo tên/email khách hàng
    let data: any[] = [];
    let total = 0;

    if (keyword && !Types.ObjectId.isValid(decodeURIComponent(keyword))) {
      // Sử dụng aggregation để tìm kiếm theo tên/email khách hàng
      const searchPattern = decodeURIComponent(keyword)
        .split(' ')
        .map(term => `(?=.*${term})`)
        .join('');

      const pipeline: any[] = [
        {
          $lookup: {
            from: 'users',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        {
          $unwind: '$customer'
        },
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order'
          }
        },
        {
          $unwind: '$order'
        },
        {
          $lookup: {
            from: 'products',
            localField: 'items.productId',
            foreignField: '_id',
            as: 'products'
          }
        },
        {
          $match: {
            $or: [
              { reason: { $regex: searchPattern, $options: 'i' } },
              { description: { $regex: searchPattern, $options: 'i' } },
              { 'customer.name': { $regex: searchPattern, $options: 'i' } },
              { 'customer.email': { $regex: searchPattern, $options: 'i' } }
            ]
          }
        }
      ];

      // Thêm các filter khác
      if (status) {
        pipeline.push({ $match: { status } } as any);
      }
      if (returnType) {
        pipeline.push({ $match: { returnType } } as any);
      }
      if (startDate || endDate) {
        const dateFilter: any = {};
        if (startDate) {
          dateFilter.$gte = new Date(startDate);
        }
        if (endDate) {
          dateFilter.$lte = new Date(endDate);
        }
        pipeline.push({ $match: { createdAt: dateFilter } } as any);
      }
      if (minRefundAmount !== undefined || maxRefundAmount !== undefined) {
        const amountFilter: any = {};
        if (minRefundAmount !== undefined) {
          amountFilter.$gte = minRefundAmount;
        }
        if (maxRefundAmount !== undefined) {
          amountFilter.$lte = maxRefundAmount;
        }
        pipeline.push({ $match: { totalRefundAmount: amountFilter } } as any);
      }

      // Thêm sort
      if (sortBy === 'customerName') {
        pipeline.push({ $sort: { 'customer.name': sortOrder === 'asc' ? 1 : -1 } } as any);
      } else {
        pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } } as any);
      }

      // Thêm skip và limit
      pipeline.push({ $skip: skip } as any);
      pipeline.push({ $limit: limit } as any);

      // Thực hiện aggregation
      const [aggregationResult, totalResult] = await Promise.all([
        this.returnOrderModel.aggregate(pipeline),
        this.returnOrderModel.aggregate([
          ...pipeline.slice(0, -2), // Loại bỏ skip và limit
          { $count: 'total' }
        ])
      ]);

      data = aggregationResult;
      total = totalResult.length > 0 ? totalResult[0].total : 0;

    } else {
      // Sử dụng query thông thường nếu không có keyword hoặc keyword là ObjectId
      // Xây dựng sort object
      let sortObject: any = {};
      
      if (sortBy === 'customerName') {
        // Đối với customerName, cần sort sau khi populate
        sortObject = { createdAt: sortOrder === 'asc' ? 1 : -1 };
      } else {
        sortObject[sortBy] = sortOrder === 'asc' ? 1 : -1;
      }

      console.log('Sort object:', sortObject);

      // Thực hiện query với populate
      const [queryResult, totalResult] = await Promise.all([
        this.returnOrderModel
          .find(filter)
          .populate('orderId', 'total createdAt status')
          .populate('customerId', 'name email')
          .populate('items.productId', 'name images')
          .sort(sortObject)
          .skip(skip)
          .limit(limit)
          .exec(),
        this.returnOrderModel.countDocuments(filter),
      ]);

      data = queryResult;
      total = totalResult;

      // Nếu sort theo customerName, cần sort lại sau khi populate
      if (sortBy === 'customerName') {
        data.sort((a, b) => {
          const customerA = (a.customerId as any)?.name || '';
          const customerB = (b.customerId as any)?.name || '';
          
          if (sortOrder === 'asc') {
            return customerA.localeCompare(customerB);
          } else {
            return customerB.localeCompare(customerA);
          }
        });
      }
    }

    console.log('Found return orders:', data.length);
    console.log('Total count:', total);

    // Đảm bảo total và limit là số hợp lệ
    const validTotal = typeof total === 'number' ? total : 0;
    const validLimit = typeof limit === 'number' && limit > 0 ? limit : 10;
    
    const calculatedPages = validLimit > 0 ? Math.ceil(validTotal / validLimit) : 0;
    
    const result = {
      data,
      total: validTotal,
      pages: calculatedPages,
    };

    console.log('Advanced search result:', JSON.stringify(result, null, 2));

    return result;
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

    // Lấy thông tin đơn hàng gốc để cập nhật items
    const order = await this.orderModel.findById(returnRequest.orderId).populate('items.product');
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng gốc');
    }

    // Cập nhật status của items trong order dựa trên trạng thái return
    const returnItemIds = returnRequest.items.map(item => item.itemId.toString());

    console.log('Return item IDs:', returnItemIds);
    console.log('Order items:', order.items.map(item => ({
      itemId: item._id?.toString() || 'unknown',
      productId: item.product?._id?.toString() || item.product?.toString() || 'unknown',
      status: item.status
    })));

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const itemId = item._id?.toString();
      
      if (returnItemIds.includes(itemId)) {
        console.log(`Updating item ${itemId} status to ${updateData.status}`);
        
        // Cập nhật status của item thành return cho tất cả các trạng thái return
        order.items[i].status = 'return';
      }
    }

    if (updateData.status === 'approved') {
      console.log(
        `Đã chấp nhận trả hàng với số tiền: ${returnRequest.totalRefundAmount}`,
      );
      // Cập nhật trạng thái đơn hàng gốc thành return
      console.log('Updating order status to return');
      order.status = 'return';
      
      // Lưu thay đổi order
      await (order as any).save();
      
      console.log('Order saved successfully');
      console.log('Đã chấp nhận trả hàng và cập nhật trạng thái đơn hàng');
    } else if (updateData.status === 'processing') {
      // Cập nhật trạng thái đơn hàng gốc thành return
      order.status = 'return';
      await (order as any).save();
      console.log('Đang xử lý trả hàng');
    } else if (updateData.status === 'completed') {
      await this.restoreProductStock(returnRequest);
      
      // Xử lý đặc biệt cho refund - tạo voucher hoàn tiền
      if (returnRequest.returnType === 'refund') {
        console.log('=== PHÁT HIỆN REFUND - BẮT ĐẦU TẠO VOUCHER ===');
        console.log('Return type:', returnRequest.returnType);
        console.log('Customer ID:', returnRequest.customerId.toString());
        console.log('Refund amount:', returnRequest.totalRefundAmount);
        console.log('Order ID:', returnRequest.orderId.toString());
        console.log('Return order ID:', returnRequest._id.toString());
        console.log('Reason:', returnRequest.reason);
        
        try {
          console.log('🔄 Gọi VoucherRefundService.createRefundVoucher...');
          const voucherResult = await this.voucherRefundService.createRefundVoucher({
            userId: returnRequest.customerId.toString(),
            refundAmount: returnRequest.totalRefundAmount,
            orderId: returnRequest.orderId.toString(),
            returnOrderId: returnRequest._id.toString(),
            reason: returnRequest.reason,
            voucherType: 'item',
            validDays: 30,
            description: `Voucher hoàn tiền từ yêu cầu trả hàng - ${returnRequest.reason}`,
          });
          
          console.log('✅ Đã tạo voucher hoàn tiền thành công!');
          console.log('📝 Message:', voucherResult.message);
          console.log('💰 Giá trị voucher:', voucherResult.voucherValue);
          console.log('🆔 Voucher ID:', voucherResult.voucher._id.toString());
        } catch (voucherError) {
          console.error('❌ Lỗi tạo voucher hoàn tiền:', voucherError);
          console.error('❌ Error stack:', voucherError.stack);
          // Không throw error để không ảnh hưởng đến quá trình hoàn thành
        }
      } else {
        console.log('ℹ️ Không phải refund, bỏ qua tạo voucher. Return type:', returnRequest.returnType);
      }
      
      // Cập nhật trạng thái đơn hàng gốc thành return
      order.status = 'return';
      await (order as any).save();
      console.log('Đã hoàn thành trả hàng và cập nhật tồn kho');
    } else if (updateData.status === 'rejected') {
      // Cập nhật trạng thái đơn hàng gốc thành return
      order.status = 'return';
      await (order as any).save();
      console.log('Đã từ chối yêu cầu trả hàng');
    }

    await returnRequest.save();

    const populatedReturn = await this.returnOrderModel
      .findById(returnRequest._id)
      .populate('orderId', 'total createdAt status')
      .populate('customerId', 'name email')
      .populate('items.productId', 'name images')
      .exec();

    // Gửi thông báo cho user và admin khi admin cập nhật trạng thái trả hàng
    const statusMessages = {
      'approved': 'Yêu cầu trả hàng đã được chấp nhận',
      'processing': 'Yêu cầu trả hàng đang được xử lý',
      'completed': 'Yêu cầu trả hàng đã hoàn thành',
      'rejected': 'Yêu cầu trả hàng đã bị từ chối'
    };

    const message = statusMessages[updateData.status] || `Trạng thái yêu cầu trả hàng đã được cập nhật thành ${updateData.status}`;

    await this.notificationService.sendAndSaveNotification(
      returnRequest.customerId.toString(),
      null, // pushToken - sẽ được lấy từ user trong service
      'Cập nhật trạng thái trả hàng',
      `${message} cho đơn hàng ${order._id}`,
      'info',
      {
        type: 'return-order',
        returnOrderId: returnRequest._id.toString(),
        orderId: order._id.toString(),
        action: 'status-updated',
        status: updateData.status
      }
    );

    await this.notificationService.sendNotificationToAdmins(
      'Cập nhật trạng thái trả hàng',
      `Trạng thái yêu cầu trả hàng ${returnRequest._id} đã được cập nhật thành ${updateData.status}`,
      'info',
      {
        type: 'return-order',
        returnOrderId: returnRequest._id.toString(),
        orderId: order._id.toString(),
        action: 'status-updated',
        status: updateData.status
      }
    );

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

    // Khôi phục status của items trong order về trạng thái ban đầu
    const order = await this.orderModel.findById(returnRequest.orderId).populate('items.product');
    if (order) {
      const returnItemIds = returnRequest.items.map(item => item.itemId.toString());

      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const itemId = item._id?.toString();
        if (returnItemIds.includes(itemId)) {
          // Khôi phục về trạng thái 'delivered' nếu đơn hàng đã giao thành công
          order.items[i].status = 'delivered';
        }
      }

      // Cập nhật order với items đã khôi phục và trạng thái về 'delivered'
      order.status = 'delivered';
      await (order as any).save();
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
        console.log(`Restored ${item.quantity} items for product ${item.productId} (itemId: ${item.itemId})`);
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
