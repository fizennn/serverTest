import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReturnOrdersController } from './controllers/return-orders.controller';
import { ReturnOrderAnalyticsController } from './controllers/return-order-analytics.controller';
import { ReturnOrdersService } from './services/return-orders.service';
import { ReturnOrderAnalyticsService } from './services/return-order-analytics.service';
import { ReturnOrder, ReturnOrderSchema } from './schemas/return-order.schema';
import { Order, OrderSchema } from '@/orders/schemas/order.schema';
import { Product, ProductSchema } from '@/products/schemas/product.schema';
import { User, UserSchema } from '@/users/schemas/user.schema';
import { Category, CategorySchema } from '@/category/schemas/category.schema';
import { NotificationModule } from '@/notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReturnOrder.name, schema: ReturnOrderSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
    NotificationModule,
  ],
  controllers: [ReturnOrdersController, ReturnOrderAnalyticsController],
  providers: [ReturnOrdersService, ReturnOrderAnalyticsService],
  exports: [ReturnOrdersService, ReturnOrderAnalyticsService],
})
export class ReturnOrdersModule {}