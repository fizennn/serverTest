import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PayOSService } from './services/payOS.service';
import { PayOSController } from './controller/payOS.controller';
import { PaymentQRService } from './services/payment-qr.service';
import { PaymentQRController } from './controller/payment-qr.controller';
import { PaymentQR, PaymentQRSchema } from './schemas/payment-qr.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PaymentQR.name, schema: PaymentQRSchema },
    ]),
  ],
  controllers: [PayOSController, PaymentQRController],
  providers: [PayOSService, PaymentQRService],
  exports: [PayOSService, PaymentQRService],
})
export class PayOSModule {} 