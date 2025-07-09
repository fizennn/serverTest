import * as mongoose from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../../users/schemas/user.schema';
import { HydratedDocument } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false })
export class OrderItem {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Product',
  })
  product!: mongoose.Types.ObjectId;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: true })
  price!: number;

  @Prop({ required: true })
  variant!: string;
}

@Schema({ _id: false })
export class OrderVoucher {
  @ApiProperty({
    description: 'ID của voucher',
    example: '507f1f77bcf86cd799439011',
  })
  @Prop({ required: true })
  voucherId!: string;

  @ApiProperty({
    description: 'Loại voucher',
    example: 'item',
    enum: ['item', 'ship'],
  })
  @Prop({ required: true })
  type!: string;

  @ApiProperty({ description: 'Phần trăm giảm giá (%)', example: 10 })
  @Prop({ required: true })
  disCount!: number;

  @ApiProperty({
    description: 'Điều kiện tối thiểu để sử dụng voucher (VNĐ)',
    example: 500000,
  })
  @Prop({ required: true })
  condition!: number;

  @ApiProperty({
    description: 'Giới hạn số tiền giảm giá tối đa (VNĐ)',
    example: 100000,
  })
  @Prop({ required: true })
  limit!: number;

  @ApiProperty({
    description: 'Số tiền giảm giá thực tế được áp dụng',
    example: 50000,
  })
  @Prop({ required: true })
  appliedDiscount!: number;
}

@Schema({ timestamps: true })
export class Order {
  @ApiProperty({
    description: 'ID của đơn hàng',
    example: '507f1f77bcf86cd799439011',
  })
  _id!: mongoose.Types.ObjectId;

  @ApiProperty({
    description: 'ID của người dùng đặt hàng',
    example: '507f1f77bcf86cd799439012',
  })
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  })
  idUser!: User;

  @ApiProperty({
    description: 'Xác định đơn hàng mua tại cửa hàng (không tính phí ship)',
    example: false,
  })
  @Prop({ required: true, default: false })
  atStore!: boolean;

  @ApiProperty({
    description: 'Phương thức thanh toán',
    example: 'COD',
    enum: ['COD', 'payOS'],
  })
  @Prop({
    required: true,
    default: 'COD',
    enum: ['COD', 'payOS'],
  })
  payment!: string;

  @ApiProperty({
    description: 'Ghi chú đơn hàng',
    example: 'Giao hàng vào buổi chiều',
    required: false,
  })
  @Prop({ required: false, default: '' })
  note!: string;

  @ApiProperty({
    description: 'Địa chỉ giao hàng',
  })
  @Prop({
    required: true,
    type: {
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
  })
  address!: {
    phone: string;
    address: string;
    name: string;
  };

  @ApiProperty({
    description: 'Danh sách sản phẩm trong đơn hàng',
    type: [OrderItem],
  })
  @Prop({ required: true, type: [OrderItem], default: [] })
  items!: OrderItem[];

  @ApiProperty({
    description:
      'Danh sách voucher được áp dụng (snapshot tại thời điểm tạo order)',
    type: [OrderVoucher],
    required: false,
  })
  @Prop({ required: false, type: [OrderVoucher], default: [] })
  vouchers!: OrderVoucher[];

  @ApiProperty({
    description: 'Tổng tiền đơn hàng',
    example: 1500000,
  })
  @Prop({ required: true, default: 0 })
  total!: number;

  @ApiProperty({
    description: 'Giảm giá cho sản phẩm từ voucher',
    example: 50000,
  })
  @Prop({ required: true, default: 0 })
  itemDiscount!: number;

  @ApiProperty({
    description: 'Giảm giá cho phí vận chuyển từ voucher',
    example: 10000,
  })
  @Prop({ required: true, default: 0 })
  shipDiscount!: number;

  @ApiProperty({
    description: 'Tổng tiền sản phẩm trước khi giảm giá',
    example: 1500000,
  })
  @Prop({ required: true, default: 0 })
  subtotal!: number;

  @ApiProperty({
    description: 'Địa chỉ cửa hàng',
    example: '123 Đường ABC, Quận 1, TP.HCM',
  })
  @Prop({ required: true })
  storeAddress!: string;

  @ApiProperty({
    description: 'Phí vận chuyển',
    example: 30000,
  })
  @Prop({ required: true, default: 0 })
  shipCost!: number;

  @ApiProperty({
    description: 'Trạng thái đơn hàng',
    example: 'pending',
    enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],
  })
  @Prop({
    required: true,
    default: 'pending',
    enum: ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'],
  })
  status!: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
