import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './controller/orders.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { OrdersService } from './services/orders.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Voucher, VoucherSchema } from '../vouchers/schemas/voucher.schema';
import { ProductsModule } from '../products/products.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { UsersModule } from '../users/users.module';
import { forwardRef } from '@nestjs/common';
import { PayOSModule } from '../payOS/payOS.module';
import { NotificationModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Order.name,
        schema: OrderSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Product.name,
        schema: ProductSchema,
      },
      {
        name: Voucher.name,
        schema: VoucherSchema,
      },
    ]),
    ProductsModule,
    VouchersModule,
    UsersModule,
    forwardRef(() => PayOSModule),
    NotificationModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrderModule {}
