import { Module } from '@nestjs/common';
import { PayOSController } from './controller/payOS.controller';
import { PayOSWebhookController } from './controller/payOS-webhook.controller';
import { PayOSService } from './services/payOS.service';
import { PayOSWebhookService } from './services/payOS-webhook.service';
import { ProductsModule } from '../products/products.module';
import { OrdersModule } from '../orders/order.module';

@Module({
  imports: [ProductsModule, OrdersModule],
  controllers: [PayOSController, PayOSWebhookController],
  providers: [PayOSService, PayOSWebhookService],
  exports: [PayOSService, PayOSWebhookService],
})
export class PayOSModule {} 