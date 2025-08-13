import { Module, forwardRef } from '@nestjs/common';
import { VouchersService } from './services/vouchers.service';
import { VouchersController } from './controller/vouchers.controller';
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
  providers: [VouchersService],
  controllers: [VouchersController],
  exports: [VouchersService],
})
export class VouchersModule {} 