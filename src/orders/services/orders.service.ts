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
import { PayOSService } from '../../payOS/services/payOS.service';

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
    @Inject(forwardRef(() => PayOSService))
    private payOSService: PayOSService,
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

    order.status = 'cancelled';
    await order.save();

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

        // Giảm stock của voucher
        await this.voucherModel.findByIdAndUpdate(voucherId, {
          $inc: { stock: -1 },
        });
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

        // Giảm stock của voucher
        await this.voucherModel.findByIdAndUpdate(voucherId, {
          $inc: { stock: -1 },
        });
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
            null, // Không có userId cho guest
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

        // Giảm stock của voucher
        await this.voucherModel.findByIdAndUpdate(voucherId, {
          $inc: { stock: -1 },
        });
      }
    }

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

  async updatePaymentStatus(id: string, paymentStatus: 'unpaid' | 'paid' | 'refunded' | 'cancelled' | 'expired' | 'failed' | 'pending') {
    this.logger.log(`[UPDATE_PAYMENT_STATUS] Request received - OrderId: ${id}, PaymentStatus: ${paymentStatus}`);

    try {
      const order = await this.orderModel.findById(id);
      if (!order) {
        this.logger.error(`[UPDATE_PAYMENT_STATUS] Order not found - OrderId: ${id}`);
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      this.logger.log(`[UPDATE_PAYMENT_STATUS] Order found - Current payment status: ${order.paymentStatus}`);

      order.paymentStatus = paymentStatus;
      await order.save();

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

      order.paymentStatus = paymentStatus;
      await order.save();

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

    const [data, total] = await Promise.all([
      this.orderModel
        .find({ status })
        .populate('idUser', 'name email')
        .populate('items.product', 'name images price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({ status }),
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
    const statuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
    const counts = {};

    // Lấy số lượng đơn hàng cho từng trạng thái
    const countPromises = statuses.map(async (status) => {
      const count = await this.orderModel.countDocuments({ status });
      counts[status] = count;
    });

    await Promise.all(countPromises);

    // Tính tổng số đơn hàng
    const total = Object.values(counts).reduce((sum: number, count: number) => sum + count, 0);

    return {
      ...counts,
      total
    };
  }
}
