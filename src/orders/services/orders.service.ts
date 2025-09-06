import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import { CreateOrderDto, CreateOrderAdminDto, CreateOrderGuestDto } from '../dtos/create-order.dto';
import { UpdateOrderDto } from '../dtos/update-order.dto';
import { User } from '../../users/schemas/user.schema';
import { Product } from '../../products/schemas/product.schema';
import { Voucher } from '../../vouchers/schemas/voucher.schema';
import { ProductsService } from '../../products/services/products.service';
import { VouchersService } from '../../vouchers/services/vouchers.service';
import { VoucherRefundService } from '../../vouchers/services/voucher-refund.service';
import { UsersService } from '../../users/services/users.service';
import { PayOSService } from '../../payOS/services/payOS.service';
import { NotificationService } from '../../notifications/notifications.service';
import { AdvancedSearchOrderDto, PaginatedSearchOrderResponseDto, SortField, SortOrder } from '../dtos/search-order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Voucher.name) private voucherModel: Model<Voucher>,
    private productsService: ProductsService,
    private vouchersService: VouchersService,
    private voucherRefundService: VoucherRefundService,
    private usersService: UsersService,
    @Inject(forwardRef(() => PayOSService))
    private payOSService: PayOSService,
    private notificationService: NotificationService,
  ) {}

  async cancelUserOrder(orderId: string, userId: string) {
    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (order.idUser.toString() !== userId) {
      throw new ForbiddenException('Không có quyền hủy đơn hàng này');
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      throw new BadRequestException(
        'Không thể hủy đơn hàng ở trạng thái hiện tại',
      );
    }

    // Hoàn trả voucher nếu có
    if (order.vouchers && order.vouchers.length > 0) {
      for (const voucherInfo of order.vouchers) {
        try {
          await this.vouchersService.returnVoucherUsage(
            voucherInfo.voucherId.toString(),
            userId,
          );
        } catch (error) {
          console.error('Lỗi khi hoàn trả voucher:', error);
          // Không throw error để không ảnh hưởng đến việc hủy đơn hàng
        }
      }
    }

    // Hoàn trả tồn kho
    for (const item of order.items) {
      try {
        console.log(`[CANCEL_ORDER] Returning stock for item:`, {
          productId: item.product._id.toString(),
          variant: item.variant,
          quantity: item.quantity
        });
        
        await this.productsService.returnStock(
          item.product._id.toString(),
          item.variant,
          item.quantity,
        );
      } catch (error) {
        console.error('Lỗi khi hoàn trả tồn kho:', error);
        // Không throw error để không ảnh hưởng đến việc hủy đơn hàng
      }
    }

    // Xử lý hoàn tiền cho đơn hàng đã thanh toán
    console.log('=== KIỂM TRA HOÀN TIỀN KHI HỦY ĐƠN HÀNG ===');
    console.log('Payment status:', order.paymentStatus);
    console.log('Payment method:', order.payment);
    console.log('Order total:', order.total);
    
    if (order.paymentStatus === 'paid' && ['payOS', 'GOOGLE_PAY'].includes(order.payment)) {
      console.log('🔄 Phát hiện đơn hàng đã thanh toán - bắt đầu tạo voucher hoàn tiền');
      
      try {
        const voucherResult = await this.voucherRefundService.createRefundVoucher({
          userId: order.idUser.toString(),
          refundAmount: order.total,
          orderId: order._id.toString(),
          reason: 'Hủy đơn hàng đã thanh toán',
          voucherType: 'item',
          validDays: 30,
          description: `Voucher hoàn tiền từ việc hủy đơn hàng - ${order._id}`,
        });
        
        console.log('✅ Đã tạo voucher hoàn tiền thành công!');
        console.log('💰 Giá trị voucher:', voucherResult.voucherValue);
        console.log('🆔 Voucher ID:', voucherResult.voucher._id.toString());
        
        // Cập nhật payment status thành refunded
        order.paymentStatus = 'refunded';
        console.log('📝 Đã cập nhật payment status thành refunded');
        
      } catch (voucherError) {
        console.error('❌ Lỗi tạo voucher hoàn tiền:', voucherError);
        console.error('❌ Error stack:', voucherError.stack);
        // Không throw error để không ảnh hưởng đến quá trình hủy đơn hàng
      }
    } else {
      console.log('ℹ️ Không cần hoàn tiền - đơn hàng chưa thanh toán hoặc thanh toán COD');
    }

    order.status = 'cancelled';
    await order.save();

    // Gửi thông báo cho admin khi đơn hàng bị hủy
    try {
      await this.notificationService.sendNotificationToAdmins(
        'Đơn hàng đã bị hủy',
        `Đơn hàng ${order._id} đã bị hủy bởi người dùng`,
        'system',
        {
          userId: order._id.toString(),
          action: 'order_cancelled'
        },
        true
      );
    } catch (error) {
      console.error('Lỗi khi gửi thông báo hủy đơn hàng cho admin:', error);
    }

    // Gửi thông báo cho user khi đơn hàng bị hủy
    try {
      const user = await this.userModel.findById(userId);
      if (user) {
        await this.notificationService.sendAndSaveNotification(
          userId,
          user.deviceId || null,
          'Đơn hàng đã được hủy',
          `Đơn hàng ${order._id} đã được hủy thành công`,
          'order_cancelled',
          {
            userId: order._id.toString(),
            action: 'order_cancelled'
          }
        );
      }
    } catch (error) {
      console.error('Lỗi khi gửi thông báo hủy đơn hàng cho user:', error);
    }

    return { message: 'Hủy đơn hàng thành công' };
  }
  async create(
    orderAttrs: CreateOrderDto,
    userId: string,
  ): Promise<OrderDocument> {
    const {
      items,
      address,
      note,
      vouchers,
      storeAddress,
      shipCost,
      atStore = false,
      payment = 'COD',
    } = orderAttrs;

    if (items && items.length < 1)
      throw new BadRequestException('No order items received.');

    // Lấy thông tin địa chỉ từ user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let userAddress = null;
    if (address) {
      userAddress = user.addresses?.find(
        addr => addr._id?.toString() === address,
      );
      if (!userAddress) {
        throw new BadRequestException('Address not found in user addresses');
      }
    } else if (!atStore) {
      // Nếu không phải mua tại cửa hàng thì phải có địa chỉ
      throw new BadRequestException('Address is required for delivery orders');
    }

    // Lấy thông tin sản phẩm và tạo order items
    const orderItems = [];
    let subtotal = 0; // Tổng tiền sản phẩm trước khi áp dụng voucher

    for (const item of items) {
      // Sử dụng method có sẵn để lấy thông tin sản phẩm theo sizeId
      const products = await this.productsService.findBySizeId(item.sizeId);

      if (!products || products.length === 0) {
        throw new BadRequestException(
          `Không tìm thấy sản phẩm với size ID ${item.sizeId}`,
        );
      }

      // Lấy sản phẩm đầu tiên (vì findBySizeId trả về array)
      const filteredProduct = products[0];

      // Lấy product gốc từ database để có thể save
      const product = await this.productModel.findById(filteredProduct._id);
      if (!product) {
        throw new BadRequestException(
          `Không tìm thấy sản phẩm với ID ${filteredProduct._id}`,
        );
      }

      // Tìm size cụ thể trong product
      let foundSize = null;
      let foundVariant = null;

      for (const variant of product.variants) {
        const size = variant.sizes.find(
          (s: any) => s._id.toString() === item.sizeId,
        );
        if (size) {
          foundSize = size;
          foundVariant = variant;
          break;
        }
      }

      if (!foundSize) {
        throw new BadRequestException(
          `Không tìm thấy size với ID ${item.sizeId}`,
        );
      }

      // Kiểm tra số lượng tồn kho của size cụ thể
      if (item.quantity > foundSize.stock) {
        throw new BadRequestException(
          `Not enough stock for size ${foundSize.size} of product ${product.name}. Available: ${foundSize.stock}`,
        );
      }

      // Tính tổng tiền sản phẩm
      const itemTotal = foundSize.price * item.quantity;
      subtotal += itemTotal;

      // Tạo order item object với thông tin đầy đủ
      const orderItem = {
        product: new Types.ObjectId(product._id),
        quantity: item.quantity,
        price: foundSize.price, // Sử dụng giá của size cụ thể
        variant: `${product.name} - ${foundVariant.color} - ${foundSize.size}`, // Thông tin chi tiết variant
        status: 'pending', // Trạng thái mặc định khi tạo đơn hàng
      };

      orderItems.push(orderItem);

      // Cập nhật số lượng tồn kho của size cụ thể
      foundSize.stock -= item.quantity;
      
      // Cập nhật countInStock tổng thể dựa trên stock của tất cả variants
      product.countInStock = this.productsService.calculateTotalStockFromVariants(product.variants);
      
      await product.save();
    }

    // Tính toán phí ship dựa trên atStore
    const finalShipCost = atStore ? 0 : (shipCost || 0);

    // Tính toán discount từ voucher
    let itemDiscount = 0; // Giảm giá cho sản phẩm
    let shipDiscount = 0; // Giảm giá cho phí vận chuyển
    const orderVouchers = [];

    if (vouchers && vouchers.length > 0) {
      for (const voucherId of vouchers) {
        if (!Types.ObjectId.isValid(voucherId)) {
          throw new BadRequestException(`Invalid voucher ID: ${voucherId}`);
        }

        // Lấy thông tin voucher từ database
        const voucher = await this.voucherModel.findById(voucherId);
        if (!voucher) {
          throw new BadRequestException(`Voucher not found: ${voucherId}`);
        }

        // Sử dụng VouchersService để tính toán discount
        const voucherResult =
          await this.vouchersService.calculateVoucherDiscount(
            voucherId,
            userId,
            subtotal,
            finalShipCost,
          );

        if (!voucherResult.valid) {
          throw new BadRequestException(
            `Voucher ${voucherId}: ${voucherResult.message}`,
          );
        }

        // Cộng dồn discount
        itemDiscount += voucherResult.itemDiscount;
        shipDiscount += voucherResult.shipDiscount;

        // Tạo snapshot voucher cho order
        const orderVoucher = {
          voucherId: voucherId,
          type: voucher.type,
          disCount: voucher.disCount,
          condition: voucher.condition,
          limit: voucher.limit,
          appliedDiscount:
            voucherResult.itemDiscount + voucherResult.shipDiscount,
        };

        orderVouchers.push(orderVoucher);
      }
    }

    // Tính tổng tiền cuối cùng
    const total = subtotal - itemDiscount + (finalShipCost - shipDiscount);

    // Tạo orderCode cho PayOS (sử dụng timestamp để tạo số duy nhất)
    const orderCode = Math.floor(Date.now() / 1000) % 1000000; // 6 chữ số

    try {
      // Tạo order với đầy đủ dữ liệu
      const orderData = {
        idUser: new Types.ObjectId(userId),
        atStore,
        payment,
        address: userAddress ? {
          phone: userAddress.phone,
          address: userAddress.address,
        } : null,
        items: orderItems,
        note: note || '',
        subtotal, // Tổng tiền sản phẩm trước khi giảm giá
        itemDiscount, // Giảm giá cho sản phẩm
        shipDiscount, // Giảm giá cho phí vận chuyển
        total,
        storeAddress: storeAddress || '',
        shipCost: finalShipCost,
        status: 'pending',
        vouchers: orderVouchers,
        paymentStatus: 'unpaid',
        orderCode, // Thêm orderCode cho PayOS
      };

      // Log để debug
      console.log(
        'Creating order with data:',
        JSON.stringify(orderData, null, 2),
      );
      console.log(
        'Subtotal:',
        subtotal,
        'Item Discount:',
        itemDiscount,
        'Ship Discount:',
        shipDiscount,
        'Total:',
        total,
        'At Store:',
        atStore,
        'Payment:',
        payment,
        'OrderCode:',
        orderCode,
      );

      const createdOrder = await this.orderModel.create(orderData);
      console.log('Created order:', createdOrder);

      // Populate dữ liệu để trả về đầy đủ thông tin (không cần populate voucher nữa)
      const populatedOrder = await this.orderModel
        .findById(createdOrder._id)
        .populate('idUser', 'name email')
        .populate('items.product', 'name images price')
        .exec();

      console.log('Populated order vouchers:', populatedOrder.vouchers);
      
      // Xóa voucher khỏi user sau khi tạo đơn hàng thành công
      if (vouchers && vouchers.length > 0) {
        for (const voucherId of vouchers) {
          try {
            await this.usersService.removeVoucherFromUser(userId, voucherId, this.vouchersService);
            console.log(`Đã xóa voucher ${voucherId} khỏi user ${userId}`);
          } catch (error) {
            console.error(`Lỗi khi xóa voucher ${voucherId} khỏi user ${userId}:`, error);
            // Không throw error để không ảnh hưởng đến việc tạo đơn hàng
          }
        }
      }
      
      // Gửi thông báo cho admin khi có đơn hàng mới
      try {
        await this.notificationService.sendNotificationToAdmins(
          'Đơn hàng mới đã được tạo',
          `Đơn hàng ${createdOrder._id} đã được tạo`,
          'system',
          {
            userId: createdOrder._id.toString(),
            action: 'order'
          },
          true
        );
      } catch (error) {
        console.error('Lỗi khi gửi thông báo cho admin:', error);
      }

      // Gửi thông báo cho user khi đơn hàng được tạo thành công
      try {
        await this.notificationService.sendAndSaveNotification(
          userId,
          user.deviceId || null,
          'Đơn hàng đã được tạo thành công',
          `Đơn hàng ${createdOrder._id} đã được tạo thành công`,
          'order',
          {
            userId: createdOrder._id.toString(),
            action: 'order'
          }
        );
      } catch (error) {
        console.error('Lỗi khi gửi thông báo cho user:', error);
      }
      
      return populatedOrder;
    } catch (error) {
      // Log lỗi để debug
      console.error('Error creating order:', error);
      throw new BadRequestException('Failed to create order: ' + error.message);
    }
  }

  async createForAdmin(
    orderAttrs: CreateOrderAdminDto,
  ): Promise<OrderDocument> {
    const {
      userId,
      items,
      note,
      vouchers,
      storeAddress,
      shipCost,
      atStore = false,
      payment = 'COD',
      status = 'pending',
      paymentStatus = 'unpaid',
    } = orderAttrs;

    if (items && items.length < 1)
      throw new BadRequestException('No order items received.');

    // Kiểm tra user có tồn tại không
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Lấy thông tin sản phẩm và tạo order items
    const orderItems = [];
    let subtotal = 0; // Tổng tiền sản phẩm trước khi áp dụng voucher

    for (const item of items) {
      // Sử dụng method có sẵn để lấy thông tin sản phẩm theo sizeId
      const products = await this.productsService.findBySizeId(item.sizeId);

      if (!products || products.length === 0) {
        throw new BadRequestException(
          `Không tìm thấy sản phẩm với size ID ${item.sizeId}`,
        );
      }

      // Lấy sản phẩm đầu tiên (vì findBySizeId trả về array)
      const filteredProduct = products[0];

      // Lấy product gốc từ database để có thể save
      const product = await this.productModel.findById(filteredProduct._id);
      if (!product) {
        throw new BadRequestException(
          `Không tìm thấy sản phẩm với ID ${filteredProduct._id}`,
        );
      }

      // Tìm size cụ thể trong product
      let foundSize = null;
      let foundVariant = null;

      for (const variant of product.variants) {
        const size = variant.sizes.find(
          (s: any) => s._id.toString() === item.sizeId,
        );
        if (size) {
          foundSize = size;
          foundVariant = variant;
          break;
        }
      }

      if (!foundSize) {
        throw new BadRequestException(
          `Không tìm thấy size với ID ${item.sizeId}`,
        );
      }

      // Kiểm tra số lượng tồn kho của size cụ thể
      if (item.quantity > foundSize.stock) {
        throw new BadRequestException(
          `Not enough stock for size ${foundSize.size} of product ${product.name}. Available: ${foundSize.stock}`,
        );
      }

      // Tính tổng tiền sản phẩm
      const itemTotal = foundSize.price * item.quantity;
      subtotal += itemTotal;

      // Tạo order item object với thông tin đầy đủ
      const orderItem = {
        product: new Types.ObjectId(product._id),
        quantity: item.quantity,
        price: foundSize.price, // Sử dụng giá của size cụ thể
        variant: `${product.name} - ${foundVariant.color} - ${foundSize.size}`, // Thông tin chi tiết variant
        status: 'pending', // Trạng thái mặc định khi tạo đơn hàng
      };

      orderItems.push(orderItem);

      // Cập nhật số lượng tồn kho của size cụ thể
      foundSize.stock -= item.quantity;
      
      // Cập nhật countInStock tổng thể dựa trên stock của tất cả variants
      product.countInStock = this.productsService.calculateTotalStockFromVariants(product.variants);
      
      await product.save();
    }

    // Tính toán phí ship dựa trên atStore
    const finalShipCost = atStore ? 0 : (shipCost || 0);

    // Tính toán discount từ voucher
    let itemDiscount = 0; // Giảm giá cho sản phẩm
    let shipDiscount = 0; // Giảm giá cho phí vận chuyển
    const orderVouchers = [];

    if (vouchers && vouchers.length > 0) {
      for (const voucherId of vouchers) {
        if (!Types.ObjectId.isValid(voucherId)) {
          throw new BadRequestException(`Invalid voucher ID: ${voucherId}`);
        }

        // Lấy thông tin voucher từ database
        const voucher = await this.voucherModel.findById(voucherId);
        if (!voucher) {
          throw new BadRequestException(`Voucher not found: ${voucherId}`);
        }

        // Sử dụng VouchersService để tính toán discount
        const voucherResult =
          await this.vouchersService.calculateVoucherDiscount(
            voucherId,
            userId,
            subtotal,
            finalShipCost,
          );

        if (!voucherResult.valid) {
          throw new BadRequestException(
            `Voucher ${voucherId}: ${voucherResult.message}`,
          );
        }

        // Cộng dồn discount
        itemDiscount += voucherResult.itemDiscount;
        shipDiscount += voucherResult.shipDiscount;

        // Tạo snapshot voucher cho order
        const orderVoucher = {
          voucherId: voucherId,
          type: voucher.type,
          disCount: voucher.disCount,
          condition: voucher.condition,
          limit: voucher.limit,
          appliedDiscount:
            voucherResult.itemDiscount + voucherResult.shipDiscount,
        };

        orderVouchers.push(orderVoucher);
      }
    }

    // Tính tổng tiền cuối cùng
    const total = subtotal - itemDiscount + (finalShipCost - shipDiscount);

    // Tạo orderCode cho PayOS (sử dụng timestamp để tạo số duy nhất)
    const orderCode = Math.floor(Date.now() / 1000) % 1000000; // 6 chữ số

    try {
      // Tạo order với đầy đủ dữ liệu (không có address)
      const orderData = {
        idUser: new Types.ObjectId(userId),
        atStore,
        payment,
        address: null, // Admin không cần address
        items: orderItems,
        note: note || '',
        subtotal, // Tổng tiền sản phẩm trước khi giảm giá
        itemDiscount, // Giảm giá cho sản phẩm
        shipDiscount, // Giảm giá cho phí vận chuyển
        total,
        storeAddress: storeAddress || '',
        shipCost: finalShipCost,
        status,
        vouchers: orderVouchers,
        paymentStatus,
        orderCode, // Thêm orderCode cho PayOS
      };

      // Log để debug
      console.log(
        'Creating admin order with data:',
        JSON.stringify(orderData, null, 2),
      );
      console.log(
        'Subtotal:',
        subtotal,
        'Item Discount:',
        itemDiscount,
        'Ship Discount:',
        shipDiscount,
        'Total:',
        total,
        'At Store:',
        atStore,
        'Payment:',
        payment,
        'OrderCode:',
        orderCode,
        'Status:',
        status,
        'PaymentStatus:',
        paymentStatus,
      );

      const createdOrder = await this.orderModel.create(orderData);
      console.log('Created admin order:', createdOrder);

      // Populate dữ liệu để trả về đầy đủ thông tin
      const populatedOrder = await this.orderModel
        .findById(createdOrder._id)
        .populate('idUser', 'name email')
        .populate('items.product', 'name images price')
        .exec();

      console.log('Populated admin order vouchers:', populatedOrder.vouchers);
      
      // Xóa voucher khỏi user sau khi tạo đơn hàng thành công
      if (vouchers && vouchers.length > 0) {
        for (const voucherId of vouchers) {
          try {
            await this.usersService.removeVoucherFromUser(userId, voucherId, this.vouchersService);
            console.log(`Đã xóa voucher ${voucherId} khỏi user ${userId}`);
          } catch (error) {
            console.error(`Lỗi khi xóa voucher ${voucherId} khỏi user ${userId}:`, error);
            // Không throw error để không ảnh hưởng đến việc tạo đơn hàng
          }
        }
      }
      
      // Gửi thông báo cho admin khi có đơn hàng mới được tạo bởi admin
      try {
        await this.notificationService.sendNotificationToAdmins(
          'Đơn hàng mới đã được tạo bởi admin',
          `Đơn hàng ${createdOrder._id} đã được tạo bởi admin`,
          'system',
          {
            userId: createdOrder._id.toString(),
            action: 'order_admin_created'
          },
          true
        );
      } catch (error) {
        console.error('Lỗi khi gửi thông báo cho admin:', error);
      }

      // Gửi thông báo cho user khi đơn hàng được tạo thành công
      try {
        const user = await this.userModel.findById(userId);
        if (user) {
          await this.notificationService.sendAndSaveNotification(
            userId,
            user.deviceId || null,
            'Đơn hàng đã được tạo thành công',
            `Đơn hàng ${createdOrder._id} đã được tạo thành công bởi admin`,
            'order_admin_created',
            {
              userId: createdOrder._id.toString(),
              action: 'order_admin_created'
            }
          );
        }
      } catch (error) {
        console.error('Lỗi khi gửi thông báo cho user:', error);
      }
      
      return populatedOrder;
    } catch (error) {
      // Log lỗi để debug
      console.error('Error creating admin order:', error);
      throw error;
    }
  }

  async createForGuest(
    orderAttrs: CreateOrderGuestDto,
  ): Promise<OrderDocument> {
    const {
      customerInfo,
      items,
      note,
      vouchers,
      storeAddress,
      shipCost,
      atStore = true, // Mặc định là mua tại shop
      payment = 'COD',
      status = 'confirmed', // Mặc định là confirmed vì đã thanh toán tại shop
      paymentStatus = 'paid', // Mặc định là paid vì đã thanh toán tại shop
    } = orderAttrs;

    if (items && items.length < 1)
      throw new BadRequestException('No order items received.');

    // Lấy thông tin sản phẩm và tạo order items
    const orderItems = [];
    let subtotal = 0; // Tổng tiền sản phẩm trước khi áp dụng voucher

    for (const item of items) {
      // Sử dụng method có sẵn để lấy thông tin sản phẩm theo sizeId
      const products = await this.productsService.findBySizeId(item.sizeId);

      if (!products || products.length === 0) {
        throw new BadRequestException(
          `Không tìm thấy sản phẩm với size ID ${item.sizeId}`,
        );
      }

      // Lấy sản phẩm đầu tiên (vì findBySizeId trả về array)
      const filteredProduct = products[0];

      // Lấy product gốc từ database để có thể save
      const product = await this.productModel.findById(filteredProduct._id);
      if (!product) {
        throw new BadRequestException(
          `Không tìm thấy sản phẩm với ID ${filteredProduct._id}`,
        );
      }

      // Tìm size cụ thể trong product
      let foundSize = null;
      let foundVariant = null;

      for (const variant of product.variants) {
        const size = variant.sizes.find(
          (s: any) => s._id.toString() === item.sizeId,
        );
        if (size) {
          foundSize = size;
          foundVariant = variant;
          break;
        }
      }

      if (!foundSize) {
        throw new BadRequestException(
          `Không tìm thấy size với ID ${item.sizeId}`,
        );
      }

      // Kiểm tra số lượng tồn kho của size cụ thể
      if (item.quantity > foundSize.stock) {
        throw new BadRequestException(
          `Not enough stock for size ${foundSize.size} of product ${product.name}. Available: ${foundSize.stock}`,
        );
      }

      // Tính tổng tiền sản phẩm
      const itemTotal = foundSize.price * item.quantity;
      subtotal += itemTotal;

      // Tạo order item object với thông tin đầy đủ
      const orderItem = {
        product: new Types.ObjectId(product._id),
        quantity: item.quantity,
        price: foundSize.price, // Sử dụng giá của size cụ thể
        variant: `${product.name} - ${foundVariant.color} - ${foundSize.size}`, // Thông tin chi tiết variant
        status: 'pending', // Trạng thái mặc định khi tạo đơn hàng
      };

      orderItems.push(orderItem);

      // Cập nhật số lượng tồn kho của size cụ thể
      foundSize.stock -= item.quantity;
      
      // Cập nhật countInStock tổng thể dựa trên stock của tất cả variants
      product.countInStock = this.productsService.calculateTotalStockFromVariants(product.variants);
      
      await product.save();
    }

    // Tính toán phí ship dựa trên atStore
    const finalShipCost = atStore ? 0 : (shipCost || 0);

    // Guest không sử dụng voucher
    const itemDiscount = 0; // Không có giảm giá cho sản phẩm
    const shipDiscount = 0; // Không có giảm giá cho phí vận chuyển
    const orderVouchers = []; // Không có voucher

    // Tính tổng tiền cuối cùng
    const total = subtotal - itemDiscount + (finalShipCost - shipDiscount);

    // Tạo orderCode cho PayOS (sử dụng timestamp để tạo số duy nhất)
    const orderCode = Math.floor(Date.now() / 1000) % 1000000; // 6 chữ số

    try {
      // Tạo order với thông tin guest customer
      const orderData = {
        idUser: null, // Không có userId cho guest
        guestCustomer: {
          name: customerInfo.name,
          phone: customerInfo.phone,
          email: customerInfo.email || '',
        },
        atStore,
        payment,
        address: null, // Không có address cho guest
        items: orderItems,
        note: note || '',
        subtotal, // Tổng tiền sản phẩm trước khi giảm giá
        itemDiscount, // Giảm giá cho sản phẩm
        shipDiscount, // Giảm giá cho phí vận chuyển
        total,
        storeAddress: storeAddress || '',
        shipCost: finalShipCost,
        status,
        vouchers: orderVouchers,
        paymentStatus,
        orderCode, // Thêm orderCode cho PayOS
      };

      // Log để debug
      console.log(
        'Creating guest order with data:',
        JSON.stringify(orderData, null, 2),
      );
      console.log(
        'Guest Customer Info:',
        customerInfo,
        'Subtotal:',
        subtotal,
        'Item Discount:',
        itemDiscount,
        'Ship Discount:',
        shipDiscount,
        'Total:',
        total,
        'At Store:',
        atStore,
        'Payment:',
        payment,
        'OrderCode:',
        orderCode,
        'Status:',
        status,
        'PaymentStatus:',
        paymentStatus,
      );

      const createdOrder = await this.orderModel.create(orderData);
      console.log('Created guest order:', createdOrder);

      // Populate dữ liệu để trả về đầy đủ thông tin
      const populatedOrder = await this.orderModel
        .findById(createdOrder._id)
        .populate('items.product', 'name images price')
        .exec();

      console.log('Populated guest order vouchers:', populatedOrder.vouchers);
      
      // Gửi thông báo cho admin khi có đơn hàng mới được tạo bởi guest
      try {
        await this.notificationService.sendNotificationToAdmins(
          'Đơn hàng mới đã được tạo bởi khách hàng',
          `Đơn hàng ${createdOrder._id} đã được tạo bởi khách hàng ${customerInfo.name}`,
          'system',
          {
            userId: createdOrder._id.toString(),
            action: 'order_guest_created'
          },
          true
        );
      } catch (error) {
        console.error('Lỗi khi gửi thông báo cho admin:', error);
      }
      
      return populatedOrder;
    } catch (error) {
      // Log lỗi để debug
      console.error('Error creating guest order:', error);
      throw error;
    }
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ data: OrderDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find()
        .populate('idUser', 'name email')
        .populate('items.product', 'name images price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(),
    ]);

    return {
      data,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid order ID.');

    const order = await this.orderModel
      .findById(id)
      .populate('idUser', 'name email')
      .populate('items.product', 'name images price')
      .exec();

    if (!order) throw new NotFoundException('No order with given ID.');

    return order;
  }

  async updateStatus(
    id: string,
    updateData: UpdateOrderDto,
  ): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid order ID.');

    const order = await this.orderModel.findById(id);

    if (!order) throw new NotFoundException('No order with given ID.');

    const oldStatus = order.status;
    const oldNote = order.note;

    if (updateData.status) {
      order.status = updateData.status;
    }

    if (updateData.note) {
      order.note = updateData.note;
    }

    if (updateData.atStore !== undefined) {
      order.atStore = updateData.atStore;

      // Nếu chuyển sang mua tại cửa hàng, cập nhật phí ship về 0
      if (updateData.atStore) {
        order.shipCost = 0;
        order.shipDiscount = 0;
        // Tính lại tổng tiền
        order.total = order.subtotal - order.itemDiscount;
      }
    }

    if (updateData.payment) {
      order.payment = updateData.payment;
    }

    const updatedOrder = await order.save();

    // Gửi thông báo cho user khi có thay đổi trạng thái hoặc ghi chú
    if (oldStatus !== order.status || oldNote !== order.note) {
      try {
        // Lấy thông tin user
        const user = await this.userModel.findById(order.idUser);
        if (user) {
          let title = 'Đơn hàng đã được cập nhật';
          let body = `Đơn hàng ${order._id}`;

          if (oldStatus !== order.status) {
            body += ` đã chuyển từ trạng thái "${oldStatus}" sang "${order.status}"`;
          }

          if (oldNote !== order.note && order.note) {
            body += `. Ghi chú: ${order.note}`;
          }

          await this.notificationService.sendAndSaveNotification(
            order.idUser.toString(),
            user.deviceId || null,
            title,
            body,
            'order',
            {
              userId: order._id.toString(),
              action: 'order_updated'
            }
          );
        }
      } catch (error) {
        console.error('Lỗi khi gửi thông báo cập nhật đơn hàng:', error);
      }

      // Gửi thông báo cho tất cả admin
      try {
        let adminTitle = 'Đơn hàng đã được cập nhật';
        let adminBody = `Đơn hàng ${order._id}`;
        
        if (oldStatus !== order.status) {
          adminBody += ` đã chuyển từ trạng thái "${oldStatus}" sang "${order.status}"`;
        }
        
        if (oldNote !== order.note && order.note) {
          adminBody += `. Ghi chú: ${order.note}`;
        }

        await this.notificationService.sendNotificationToAdmins(
          adminTitle,
          adminBody,
          'order_updated',
          {
            userId: order._id.toString(),
            action: 'order_updated'
          }
        );
      } catch (error) {
        console.error('Lỗi khi gửi thông báo cập nhật đơn hàng cho admin:', error);
      }
    }

    return updatedOrder;
  }

  async updateToConfirmed(id: string): Promise<OrderDocument> {
    return this.updateStatus(id, { status: 'confirmed' });
  }

  async updateToShipping(id: string): Promise<OrderDocument> {
    return this.updateStatus(id, { status: 'shipping' });
  }

  async updateToDelivered(id: string): Promise<OrderDocument> {
    this.logger.log(`[UPDATE_TO_DELIVERED] Request received - OrderId: ${id}`);

    try {
      const order = await this.orderModel.findById(id);
      if (!order) {
        this.logger.error(`[UPDATE_TO_DELIVERED] Order not found - OrderId: ${id}`);
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      this.logger.log(`[UPDATE_TO_DELIVERED] Order found - Current status: ${order.status}, Current payment status: ${order.paymentStatus}`);

      // Cập nhật trạng thái đơn hàng thành delivered
      order.status = 'delivered';
      
      // Tự động cập nhật paymentStatus thành paid khi giao hàng thành công
      if (order.paymentStatus !== 'paid') {
        order.paymentStatus = 'paid';
        this.logger.log(`[UPDATE_TO_DELIVERED] Auto-updating payment status to 'paid' for OrderId: ${id}`);
      }

      await order.save();

      // Gửi thông báo cho user khi đơn hàng được giao thành công
      try {
        const user = await this.userModel.findById(order.idUser);
        if (user) {
          await this.notificationService.sendAndSaveNotification(
            order.idUser.toString(),
            user.deviceId || null,
            'Đơn hàng đã được giao thành công',
            `Đơn hàng ${order._id} đã được giao thành công. Cảm ơn bạn đã mua hàng!`,
            'order',
            {
              userId: order._id.toString(),
              action: 'order_delivered'
            }
          );
        }
      } catch (error) {
        console.error('Lỗi khi gửi thông báo giao hàng thành công:', error);
      }

      // Gửi thông báo cho tất cả admin
      try {
        await this.notificationService.sendNotificationToAdmins(
          'Đơn hàng đã được giao thành công',
          `Đơn hàng ${order._id} đã được giao thành công cho khách hàng.`,
          'order_delivered',
          {
            userId: order._id.toString(),
            action: 'order_delivered'
          }
        );
      } catch (error) {
        console.error('Lỗi khi gửi thông báo giao hàng thành công cho admin:', error);
      }

      this.logger.log(`[UPDATE_TO_DELIVERED] Success - OrderId: ${id}, New status: delivered, New payment status: ${order.paymentStatus}`);
      return order;
    } catch (error) {
      this.logger.error(`[UPDATE_TO_DELIVERED] Error: ${error.message}`);
      throw error;
    }
  }

  async updateToCancelled(id: string): Promise<OrderDocument> {
    return this.updateStatus(id, { status: 'cancelled' });
  }

  async cancelOrderAdmin(orderId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Admin có thể hủy đơn hàng ở bất kỳ trạng thái nào, trừ khi đã hoàn thành trả hàng
    if (order.status === 'return') {
      throw new BadRequestException(
        'Không thể hủy đơn hàng đã hoàn thành trả hàng',
      );
    }

    // Hoàn trả voucher nếu có và đơn hàng chưa được giao
    if (order.vouchers && order.vouchers.length > 0 && order.status !== 'delivered') {
      for (const voucherInfo of order.vouchers) {
        try {
          // Nếu có userId, hoàn trả voucher cho user đó
          if (order.idUser) {
            await this.vouchersService.returnVoucherUsage(
              voucherInfo.voucherId.toString(),
              order.idUser.toString(),
            );
          }
          // Nếu là guest order, không cần làm gì vì guest không có user account
        } catch (error) {
          console.error('Lỗi khi hoàn trả voucher:', error);
          // Không throw error để không ảnh hưởng đến việc hủy đơn hàng
        }
      }
    }

    // Hoàn trả tồn kho nếu đơn hàng chưa được giao
    if (order.status !== 'delivered') {
      for (const item of order.items) {
        try {
          console.log(`[CANCEL_ORDER_ADMIN] Returning stock for item:`, {
            productId: item.product._id.toString(),
            variant: item.variant,
            quantity: item.quantity
          });
          
          await this.productsService.returnStock(
            item.product._id.toString(),
            item.variant,
            item.quantity,
          );
        } catch (error) {
          console.error('Lỗi khi hoàn trả tồn kho:', error);
          // Không throw error để không ảnh hưởng đến việc hủy đơn hàng
        }
      }
    }

    // Xử lý hoàn tiền cho đơn hàng đã thanh toán (Admin hủy)
    console.log('=== KIỂM TRA HOÀN TIỀN KHI ADMIN HỦY ĐƠN HÀNG ===');
    console.log('Payment status:', order.paymentStatus);
    console.log('Payment method:', order.payment);
    console.log('Order total:', order.total);
    
    if (order.paymentStatus === 'paid' && ['payOS', 'GOOGLE_PAY'].includes(order.payment)) {
      console.log('🔄 Phát hiện đơn hàng đã thanh toán - bắt đầu tạo voucher hoàn tiền (Admin hủy)');
      
      try {
        const voucherResult = await this.voucherRefundService.createRefundVoucher({
          userId: order.idUser.toString(),
          refundAmount: order.total,
          orderId: order._id.toString(),
          reason: 'Admin hủy đơn hàng đã thanh toán',
          voucherType: 'item',
          validDays: 30,
          description: `Voucher hoàn tiền từ việc admin hủy đơn hàng - ${order._id}`,
        });
        
        console.log('✅ Đã tạo voucher hoàn tiền thành công! (Admin hủy)');
        console.log('💰 Giá trị voucher:', voucherResult.voucherValue);
        console.log('🆔 Voucher ID:', voucherResult.voucher._id.toString());
        
        // Cập nhật payment status thành refunded
        order.paymentStatus = 'refunded';
        console.log('📝 Đã cập nhật payment status thành refunded');
        
      } catch (voucherError) {
        console.error('❌ Lỗi tạo voucher hoàn tiền (Admin hủy):', voucherError);
        console.error('❌ Error stack:', voucherError.stack);
        // Không throw error để không ảnh hưởng đến quá trình hủy đơn hàng
      }
    } else {
      console.log('ℹ️ Không cần hoàn tiền - đơn hàng chưa thanh toán hoặc thanh toán COD');
    }

    // Cập nhật trạng thái đơn hàng thành cancelled
    order.status = 'cancelled';
    await order.save();

    // Gửi thông báo cho admin khi đơn hàng bị hủy bởi admin
    try {
      await this.notificationService.sendNotificationToAdmins(
        'Đơn hàng đã bị hủy bởi admin',
        `Đơn hàng ${order._id} đã bị hủy bởi admin`,
        'system',
        {
          userId: order._id.toString(),
          action: 'order_admin_cancelled'
        },
        true
      );
    } catch (error) {
      console.error('Lỗi khi gửi thông báo hủy đơn hàng cho admin:', error);
    }

    // Gửi thông báo cho user khi đơn hàng bị hủy bởi admin
    if (order.idUser) {
      try {
        const user = await this.userModel.findById(order.idUser);
        if (user) {
          await this.notificationService.sendAndSaveNotification(
            order.idUser.toString(),
            user.deviceId || null,
            'Đơn hàng đã bị hủy bởi admin',
            `Đơn hàng ${order._id} đã bị hủy bởi admin`,
            'order_admin_cancelled',
            {
              userId: order._id.toString(),
              action: 'order_admin_cancelled'
            }
          );
        }
      } catch (error) {
        console.error('Lỗi khi gửi thông báo hủy đơn hàng cho user:', error);
      }
    }

    return order;
  }

  async updatePaymentStatus(id: string, paymentStatus: 'unpaid' | 'paid' | 'refunded' | 'cancelled' | 'expired' | 'failed' | 'pending') {
    this.logger.log(`[UPDATE_PAYMENT_STATUS] Request received - OrderId: ${id}, PaymentStatus: ${paymentStatus}`);

    try {
      const order = await this.orderModel.findById(id);
      if (!order) {
        this.logger.error(`[UPDATE_PAYMENT_STATUS] Order not found - OrderId: ${id}`);
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      this.logger.log(`[UPDATE_PAYMENT_STATUS] Order found - Current payment status: ${order.paymentStatus}`);

      const oldPaymentStatus = order.paymentStatus;
      order.paymentStatus = paymentStatus;
      await order.save();

      // Gửi thông báo cho user khi trạng thái thanh toán thay đổi
      if (oldPaymentStatus !== paymentStatus) {
        try {
          const user = await this.userModel.findById(order.idUser);
          if (user) {
            let title = 'Trạng thái thanh toán đã được cập nhật';
            let body = `Đơn hàng ${order._id}: `;

            switch (paymentStatus) {
              case 'paid':
                body += 'Thanh toán đã được xác nhận';
                break;
              case 'unpaid':
                body += 'Đang chờ thanh toán';
                break;
              case 'refunded':
                body += 'Đã hoàn tiền';
                break;
              case 'cancelled':
                body += 'Thanh toán đã bị hủy';
                break;
              case 'expired':
                body += 'Phiếu thanh toán đã hết hạn';
                break;
              case 'failed':
                body += 'Thanh toán thất bại';
                break;
              case 'pending':
                body += 'Đang xử lý thanh toán';
                break;
              default:
                body += `Trạng thái thanh toán: ${paymentStatus}`;
            }

            await this.notificationService.sendAndSaveNotification(
              order.idUser.toString(),
              user.deviceId || null,
              title,
              body,
              'order',
              {
                userId: order._id.toString(),
                action: 'payment_status_updated'
              }
            );
          }
        } catch (error) {
          console.error('Lỗi khi gửi thông báo cập nhật trạng thái thanh toán:', error);
        }

        // Gửi thông báo cho tất cả admin
        try {
          let adminTitle = 'Trạng thái thanh toán đã được cập nhật';
          let adminBody = `Đơn hàng ${order._id}: `;
          
          switch (paymentStatus) {
            case 'paid':
              adminBody += 'Thanh toán đã được xác nhận';
              break;
            case 'unpaid':
              adminBody += 'Đang chờ thanh toán';
              break;
            case 'refunded':
              adminBody += 'Đã hoàn tiền';
              break;
            case 'cancelled':
              adminBody += 'Thanh toán đã bị hủy';
              break;
            case 'expired':
              adminBody += 'Phiếu thanh toán đã hết hạn';
              break;
            case 'failed':
              adminBody += 'Thanh toán thất bại';
              break;
            case 'pending':
              adminBody += 'Đang xử lý thanh toán';
              break;
            default:
              adminBody += `Trạng thái thanh toán: ${paymentStatus}`;
          }

          await this.notificationService.sendNotificationToAdmins(
            adminTitle,
            adminBody,
            'payment_status_updated',
            {
              userId: order._id.toString(),
              action: 'payment_status_updated'
            }
          );
        } catch (error) {
          console.error('Lỗi khi gửi thông báo cập nhật trạng thái thanh toán cho admin:', error);
        }
      }

      this.logger.log(`[UPDATE_PAYMENT_STATUS] Success - OrderId: ${id}, New payment status: ${paymentStatus}`);
      return { message: 'Cập nhật trạng thái thanh toán thành công', paymentStatus };
    } catch (error) {
      this.logger.error(`[UPDATE_PAYMENT_STATUS] Error: ${error.message}`);
      throw error;
    }
  }

  async updatePaymentStatusByOrderCode(orderCode: number, paymentStatus: 'unpaid' | 'paid' | 'refunded') {
    this.logger.log(`[UPDATE_PAYMENT_STATUS_BY_ORDER_CODE] Request received - OrderCode: ${orderCode}, PaymentStatus: ${paymentStatus}`);

    try {
      const order = await this.orderModel.findOne({ orderCode });
      if (!order) {
        this.logger.error(`[UPDATE_PAYMENT_STATUS_BY_ORDER_CODE] Order not found - OrderCode: ${orderCode}`);
        throw new NotFoundException('Không tìm thấy đơn hàng với orderCode này');
      }

      this.logger.log(`[UPDATE_PAYMENT_STATUS_BY_ORDER_CODE] Order found - OrderId: ${order._id}, Current payment status: ${order.paymentStatus}`);

      const oldPaymentStatus = order.paymentStatus;
      order.paymentStatus = paymentStatus;
      await order.save();

      // Gửi thông báo cho user khi trạng thái thanh toán thay đổi
      if (oldPaymentStatus !== paymentStatus) {
        try {
          const user = await this.userModel.findById(order.idUser);
          if (user) {
            let title = 'Trạng thái thanh toán đã được cập nhật';
            let body = `Đơn hàng ${order._id}: `;

            switch (paymentStatus) {
              case 'paid':
                body += 'Thanh toán đã được xác nhận';
                break;
              case 'unpaid':
                body += 'Đang chờ thanh toán';
                break;
              case 'refunded':
                body += 'Đã hoàn tiền';
                break;
              default:
                body += `Trạng thái thanh toán: ${paymentStatus}`;
            }

            await this.notificationService.sendAndSaveNotification(
              order.idUser.toString(),
              user.deviceId || null,
              title,
              body,
              'order',
              {
                userId: order._id.toString(),
                action: 'payment_status_updated'
              }
            );
          }
        } catch (error) {
          console.error('Lỗi khi gửi thông báo cập nhật trạng thái thanh toán:', error);
        }

        // Gửi thông báo cho tất cả admin
        try {
          let adminTitle = 'Trạng thái thanh toán đã được cập nhật';
          let adminBody = `Đơn hàng ${order._id}: `;
          
          switch (paymentStatus) {
            case 'paid':
              adminBody += 'Thanh toán đã được xác nhận';
              break;
            case 'unpaid':
              adminBody += 'Đang chờ thanh toán';
              break;
            case 'refunded':
              adminBody += 'Đã hoàn tiền';
              break;
            default:
              adminBody += `Trạng thái thanh toán: ${paymentStatus}`;
          }

          await this.notificationService.sendNotificationToAdmins(
            adminTitle,
            adminBody,
            'payment_status_updated',
            {
              userId: order._id.toString(),
              action: 'payment_status_updated'
            }
          );
        } catch (error) {
          console.error('Lỗi khi gửi thông báo cập nhật trạng thái thanh toán cho admin:', error);
        }
      }

      this.logger.log(`[UPDATE_PAYMENT_STATUS_BY_ORDER_CODE] Success - OrderCode: ${orderCode}, New payment status: ${paymentStatus}`);
      return { 
        message: 'Cập nhật trạng thái thanh toán thành công', 
        paymentStatus,
        order 
      };
    } catch (error) {
      this.logger.error(`[UPDATE_PAYMENT_STATUS_BY_ORDER_CODE] Error: ${error.message}`);
      throw error;
    }
  }

  async findUserOrders(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: OrderDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.orderModel
        .find({ idUser: userId })
        .populate('items.product', 'name images price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({ idUser: userId }),
    ]);

    return {
      data,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findOrdersByStatus(
    status: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: OrderDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    let query: any = {};
    
    if (status === 'return') {
      // Nếu tìm kiếm trạng thái 'return', lấy tất cả đơn hàng có trạng thái 'return' 
      // và các đơn hàng không thuộc 5 trạng thái cơ bản
      query.$or = [
        { status: 'return' },
        { status: { $nin: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'] } }
      ];
    } else {
      query.status = status;
    }

    const [data, total] = await Promise.all([
      this.orderModel
        .find(query)
        .populate('idUser', 'name email')
        .populate('items.product', 'name images price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(query),
    ]);

    return {
      data,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async deleteOrder(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid order ID.');

    const order = await this.orderModel.findById(id);

    if (!order) throw new NotFoundException('No order with given ID.');

    await this.orderModel.findByIdAndDelete(id);
  }

  async updateItemStatus(
    orderId: string,
    itemIndex: number,
    status: string
  ): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(orderId))
      throw new BadRequestException('Invalid order ID.');

    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (itemIndex < 0 || itemIndex >= order.items.length) {
      throw new BadRequestException('Invalid item index');
    }

    // Cập nhật status của item cụ thể
    order.items[itemIndex].status = status;
    await order.save();

    return order;
  }

  async updateItemStatusById(
    orderId: string,
    itemId: string,
    status: string
  ): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(orderId))
      throw new BadRequestException('Invalid order ID.');

    if (!Types.ObjectId.isValid(itemId))
      throw new BadRequestException('Invalid item ID.');

    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Tìm item theo ID
    const itemIndex = order.items.findIndex(item => item._id?.toString() === itemId);
    if (itemIndex === -1) {
      throw new NotFoundException('Item not found in order');
    }

    // Cập nhật status của item cụ thể
    order.items[itemIndex].status = status;
    await order.save();

    return order;
  }

  async getItemById(
    orderId: string,
    itemId: string
  ) {
    if (!Types.ObjectId.isValid(orderId))
      throw new BadRequestException('Invalid order ID.');

    if (!Types.ObjectId.isValid(itemId))
      throw new BadRequestException('Invalid item ID.');

    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Tìm item theo ID
    const item = order.items.find(item => item._id?.toString() === itemId);
    if (!item) {
      throw new NotFoundException('Item not found in order');
    }

    return item;
  }

  async updateAllItemsStatus(
    orderId: string,
    status: string
  ): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(orderId))
      throw new BadRequestException('Invalid order ID.');

    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Cập nhật status của tất cả items
    order.items.forEach(item => {
      item.status = status;
    });
    await order.save();

    return order;
  }

  async updateItemsStatusByProduct(
    orderId: string,
    productId: string,
    status: string
  ): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(orderId))
      throw new BadRequestException('Invalid order ID.');

    if (!Types.ObjectId.isValid(productId))
      throw new BadRequestException('Invalid product ID.');

    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Debug: Log thông tin order và productId
    console.log('Order items:', order.items);
    console.log('Looking for productId:', productId);
    console.log('ProductId type:', typeof productId);

    // Tìm và cập nhật tất cả items có cùng product
    // Sử dụng nhiều cách so sánh để đảm bảo tìm được
    const updatedItems = order.items.filter(item => {
      const itemProductId = item.product.toString();
      const itemProductIdObj = item.product;
      console.log('Item product:', itemProductId, 'Type:', typeof itemProductId);
      console.log('Item product object:', itemProductIdObj);
      
      return itemProductId === productId || 
             itemProductIdObj.toString() === productId ||
             itemProductIdObj.equals(new Types.ObjectId(productId));
    });

    console.log('Found items:', updatedItems.length);

    if (updatedItems.length === 0) {
      throw new NotFoundException('No items found with this product in order');
    }

    // Cập nhật status của tất cả items có cùng product
    order.items.forEach(item => {
      const itemProductId = item.product.toString();
      const itemProductIdObj = item.product;
      
      if (itemProductId === productId || 
          itemProductIdObj.toString() === productId ||
          itemProductIdObj.equals(new Types.ObjectId(productId))) {
        item.status = status;
        console.log('Updated item status to:', status);
      }
    });
    
    await order.save();

    return order;
  }

  async getItemsByProduct(
    orderId: string,
    productId: string
  ) {
    if (!Types.ObjectId.isValid(orderId))
      throw new BadRequestException('Invalid order ID.');

    if (!Types.ObjectId.isValid(productId))
      throw new BadRequestException('Invalid product ID.');

    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Debug: Log thông tin
    console.log('Looking for productId:', productId);
    console.log('Order items:', order.items);

    // Tìm tất cả items có cùng product với nhiều cách so sánh
    const items = order.items.filter(item => {
      const itemProductId = item.product.toString();
      const itemProductIdObj = item.product;
      
      return itemProductId === productId || 
             itemProductIdObj.toString() === productId ||
             itemProductIdObj.equals(new Types.ObjectId(productId));
    });

    console.log('Found items count:', items.length);

    if (items.length === 0) {
      throw new NotFoundException('No items found with this product in order');
    }

    return items;
  }

  async checkPaymentStatus(orderId: string) {
    this.logger.log(`[CHECK_PAYMENT_STATUS] Request received - OrderId: ${orderId}`);

    try {
      // 1. Lấy thông tin đơn hàng
      const order = await this.orderModel.findById(orderId);
      if (!order) {
        this.logger.error(`[CHECK_PAYMENT_STATUS] Order not found - OrderId: ${orderId}`);
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      this.logger.log(`[CHECK_PAYMENT_STATUS] Order found - Current payment status: ${order.paymentStatus}`);

      // 2. Kiểm tra nếu đơn hàng chưa được thanh toán
      if (order.paymentStatus === 'unpaid' && order.payment === 'payOS') {
        this.logger.log(`[CHECK_PAYMENT_STATUS] Order is unpaid and uses payOS - checking payment status`);

        // Kiểm tra xem có orderCode không
        if (!order.orderCode) {
          this.logger.error(`[CHECK_PAYMENT_STATUS] Order has no orderCode - OrderId: ${orderId}`);
          return { 
            message: 'Đơn hàng không có mã thanh toán PayOS', 
            paymentStatus: order.paymentStatus,
            order 
          };
        }

        try {
          // 3. Gọi API PayOS để kiểm tra trạng thái thanh toán
          const paymentInfo = await this.payOSService.getPaymentLinkInformation(order.orderCode.toString());
          
          this.logger.log(`[CHECK_PAYMENT_STATUS] PayOS response:`, paymentInfo);

          // 4. Kiểm tra trạng thái thanh toán từ PayOS
          if (paymentInfo && paymentInfo.status === 'PAID') {
            this.logger.log(`[CHECK_PAYMENT_STATUS] Payment confirmed by PayOS - updating order status`);
            
            // 5. Cập nhật trạng thái thanh toán thành 'paid'
            order.paymentStatus = 'paid';
            await order.save();

            this.logger.log(`[CHECK_PAYMENT_STATUS] Success - OrderId: ${orderId}, Payment status updated to: paid`);
            
            return { 
              message: 'Thanh toán đã được xác nhận', 
              paymentStatus: 'paid',
              order 
            };
          } else {
            this.logger.log(`[CHECK_PAYMENT_STATUS] Payment not confirmed by PayOS - status: ${paymentInfo?.status}`);
            
            return { 
              message: 'Đơn hàng chưa được thanh toán', 
              paymentStatus: 'unpaid',
              order 
            };
          }
        } catch (payOSError) {
          this.logger.error(`[CHECK_PAYMENT_STATUS] PayOS API error: ${payOSError.message}`);
          
          return { 
            message: 'Không thể kiểm tra trạng thái thanh toán từ PayOS', 
            paymentStatus: order.paymentStatus,
            order,
            error: payOSError.message
          };
        }
      } else {
        this.logger.log(`[CHECK_PAYMENT_STATUS] Order payment status: ${order.paymentStatus}, payment method: ${order.payment}`);
        
        return { 
          message: 'Đơn hàng không cần kiểm tra thanh toán', 
          paymentStatus: order.paymentStatus,
          order 
        };
      }
    } catch (error) {
      this.logger.error(`[CHECK_PAYMENT_STATUS] Error: ${error.message}`);
      throw error;
    }
  }

  async getOrderStatusCounts() {
    const statuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled', 'return'];
    const counts = {};

    // Lấy số lượng đơn hàng cho từng trạng thái
    const countPromises = statuses.map(async (status) => {
      if (status === 'return') {
        // Đối với trạng thái 'return', đếm cả đơn hàng có trạng thái 'return' 
        // và các đơn hàng không thuộc 5 trạng thái cơ bản
        const returnCount = await this.orderModel.countDocuments({
          $or: [
            { status: 'return' },
            { status: { $nin: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'] } }
          ]
        });
        counts[status] = returnCount;
      } else {
        const count = await this.orderModel.countDocuments({ status });
        counts[status] = count;
      }
    });

    await Promise.all(countPromises);

    // Tính tổng số đơn hàng
    const total = Object.values(counts).reduce((sum: number, count: number) => sum + count, 0);

    return {
      ...counts,
      total
    };
  }

  async advancedSearch(
    searchDto: AdvancedSearchOrderDto,
  ): Promise<PaginatedSearchOrderResponseDto> {
    const {
      keyword,
      status,
      statuses,
      paymentStatus,
      startDate,
      endDate,
      minTotal,
      maxTotal,
      payment,
      atStore,
      sortBy = SortField.CREATED_AT,
      sortOrder = SortOrder.DESC,
      page = 1,
      limit = 10,
    } = searchDto;

    const skip = (page - 1) * limit;
    const query: any = {};

        // Tìm kiếm theo từ khóa (mã đơn hàng, tên khách hàng, _id)
    if (keyword) {
      const keywordRegex = new RegExp(keyword, 'i');
      
      // Kiểm tra xem keyword có phải là ObjectId hợp lệ không
      const isValidObjectId = Types.ObjectId.isValid(keyword);
      
      // Kiểm tra xem keyword có phải là số không (cho orderCode)
      const isNumeric = !isNaN(Number(keyword));
      
      if (isValidObjectId) {
        // Nếu keyword là ObjectId hợp lệ, tìm kiếm theo _id
        query._id = new Types.ObjectId(keyword);
      } else if (isNumeric) {
        // Nếu keyword là số, tìm kiếm theo orderCode
        query.orderCode = parseInt(keyword);
      } else {
        // Nếu keyword không phải số và không phải ObjectId, tìm kiếm theo tên khách hàng đã đăng ký
        // Sử dụng aggregation để populate và tìm kiếm
        const aggregationPipeline: any[] = [
          {
            $lookup: {
              from: 'users',
              localField: 'idUser',
              foreignField: '_id',
              as: 'userInfo'
            }
          },
          {
            $match: {
              $or: [
                // Tìm kiếm trong thông tin user đã đăng ký
                { 'userInfo.name': { $regex: keywordRegex } },
                { 'userInfo.email': { $regex: keywordRegex } }
              ]
            }
          },
          {
            $lookup: {
              from: 'products',
              localField: 'items.product',
              foreignField: '_id',
              as: 'productInfo'
            }
          }
        ];

        // Thêm sort stage
        if (sortBy === SortField.CUSTOMER_NAME) {
          aggregationPipeline.push({
            $sort: { 'userInfo.name': sortOrder === SortOrder.ASC ? 1 : -1 }
          });
        } else {
          aggregationPipeline.push({
            $sort: { [sortBy]: sortOrder === SortOrder.ASC ? 1 : -1 }
          });
        }

        aggregationPipeline.push(
          { $skip: skip },
          { $limit: limit }
        );

        const [data, totalResult] = await Promise.all([
          this.orderModel.aggregate(aggregationPipeline),
          this.orderModel.aggregate([
            {
              $lookup: {
                from: 'users',
                localField: 'idUser',
                foreignField: '_id',
                as: 'userInfo'
              }
            },
            {
              $match: {
                $or: [
                  // Tìm kiếm trong thông tin user đã đăng ký
                  { 'userInfo.name': { $regex: keywordRegex } },
                  { 'userInfo.email': { $regex: keywordRegex } }
                ]
              }
            },
            {
              $count: 'total'
            }
          ])
        ]);

        const total = totalResult.length > 0 ? totalResult[0].total : 0;

        return {
          data: data as any,
          total,
          pages: Math.ceil(total / limit),
          currentPage: page,
          limit,
        };
      }
    }

    // Tìm kiếm theo trạng thái đơn hàng
    if (status) {
      if (status === 'return') {
        // Nếu tìm kiếm trạng thái 'return', lấy tất cả đơn hàng có trạng thái 'return' 
        // và các đơn hàng không thuộc 5 trạng thái cơ bản
        query.$or = [
          { status: 'return' },
          { status: { $nin: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'] } }
        ];
      } else {
        query.status = status;
      }
    } else if (statuses) {
      if (statuses === 'return') {
        // Nếu tìm kiếm trạng thái 'return', lấy tất cả đơn hàng có trạng thái 'return' 
        // và các đơn hàng không thuộc 5 trạng thái cơ bản
        query.$or = [
          { status: 'return' },
          { status: { $nin: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'] } }
        ];
      } else {
        query.status = statuses;
      }
    }

    // Tìm kiếm theo trạng thái thanh toán
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Tìm kiếm theo atStore
    if (atStore !== undefined) {
      query.atStore = atStore;
    }

    // Tìm kiếm theo phương thức thanh toán
    if (payment) {
      query.payment = payment;
    }

    // Tìm kiếm theo khoảng giá
    if (minTotal !== undefined || maxTotal !== undefined) {
      query.total = {};
      if (minTotal !== undefined) {
        query.total.$gte = minTotal;
      }
      if (maxTotal !== undefined) {
        query.total.$lte = maxTotal;
      }
    }

    // Tìm kiếm theo khoảng thời gian
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Thực hiện tìm kiếm
    const [data, totalResult] = await Promise.all([
      this.orderModel.find(query)
        .populate('idUser', 'name email phone')
        .populate('items.product', 'name price images')
        .sort({ [sortBy]: sortOrder === SortOrder.ASC ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(query)
    ]);

    const total = totalResult;

    return {
      data: data as any,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      limit,
    };
  }

  async getSearchStats(
    status?: string,
    paymentStatus?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const query: any = {};

    // Tìm kiếm theo trạng thái đơn hàng
    if (status) {
      query.status = status;
    }

    // Tìm kiếm theo trạng thái thanh toán
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Tìm kiếm theo khoảng thời gian
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Thống kê tổng quan
    const totalOrders = await this.orderModel.countDocuments(query);
    const totalAmount = await this.orderModel.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Thống kê theo trạng thái
    const statusBreakdown = await this.orderModel.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Thống kê theo trạng thái thanh toán
    const paymentBreakdown = await this.orderModel.aggregate([
      { $match: query },
      { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
    ]);

    // Chuyển đổi kết quả thành object
    const statusStats = {};
    statusBreakdown.forEach(item => {
      statusStats[item._id] = item.count;
    });

    const paymentStats = {};
    paymentBreakdown.forEach(item => {
      paymentStats[item._id] = item.count;
    });

    const totalAmountValue = totalAmount.length > 0 ? totalAmount[0].total : 0;
    const averageOrderValue = totalOrders > 0 ? totalAmountValue / totalOrders : 0;

    return {
      totalOrders,
      totalAmount: totalAmountValue,
      averageOrderValue: Math.round(averageOrderValue),
      statusBreakdown: statusStats,
      paymentBreakdown: paymentStats,
    };
  }
}
