import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { UpdateOrderDto } from '../dtos/update-order.dto';
import { User } from '../../users/schemas/user.schema';
import { Product } from '../../products/schemas/product.schema';
import { Voucher } from '../../vouchers/schemas/voucher.schema';
import { ProductsService } from '../../products/services/products.service';
import { VouchersService } from '../../vouchers/services/vouchers.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Voucher.name) private voucherModel: Model<Voucher>,
    private productsService: ProductsService,
    private vouchersService: VouchersService,
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
    return this.updateStatus(id, { status: 'delivered' });
  }

  async updateToCancelled(id: string): Promise<OrderDocument> {
    return this.updateStatus(id, { status: 'cancelled' });
  }

  async updatePaymentStatus(id: string, paymentStatus: 'unpaid' | 'paid' | 'refunded') {
    const order = await this.orderModel.findById(id);
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }
    order.paymentStatus = paymentStatus;
    await order.save();
    return { message: 'Cập nhật trạng thái thanh toán thành công', paymentStatus };
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
}
