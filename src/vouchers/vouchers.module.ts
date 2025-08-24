import { Module, forwardRef } from '@nestjs/common';
import { VouchersService } from './services/vouchers.service';
import { VoucherRefundService } from './services/voucher-refund.service';
import { VouchersController } from './controller/vouchers.controller';
import { VoucherRefundController } from './controller/voucher-refund.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Voucher, VoucherSchema } from './schemas/voucher.schema';
import { UsersModule } from '@/users/users.module';
import { NotificationModule } from '@/notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Voucher.name,
        schema: VoucherSchema,
      },
    ]),
    forwardRef(() => UsersModule),
    NotificationModule,
  ],
  providers: [VouchersService, VoucherRefundService],
  controllers: [VouchersController, VoucherRefundController],
  exports: [VouchersService, VoucherRefundService],
})
export class VouchersModule {} 