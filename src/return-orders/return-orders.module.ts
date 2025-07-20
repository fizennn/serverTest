import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReturnOrdersController } from './controllers/return-orders.controller';
import { ReturnOrdersService } from './services/return-orders.service';
import { ReturnOrder, ReturnOrderSchema } from './schemas/return-order.schema';
import { Order, OrderSchema } from '@/orders/schemas/order.schema';
import { Product, ProductSchema } from '@/products/schemas/product.schema';
import { User, UserSchema } from '@/users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ReturnOrder.name, schema: ReturnOrderSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ReturnOrdersController],
  providers: [ReturnOrdersService],
  exports: [ReturnOrdersService],
})
export class ReturnOrdersModule {}