import { Module } from '@nestjs/common';
import { ProductsService } from './services/products.service';
import { ProductsController } from './controller/products.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { AppService } from '@/app/services/app.service';
import { Order } from '@/orders/schemas/order.schema';
import { OrderSchema } from '@/orders/schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Product.name,
        schema: ProductSchema,
      },
      {
        name: Order.name,
        schema: OrderSchema,
      },
    ]),
  ],
  providers: [ProductsService, AppService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
