import { Module, forwardRef } from '@nestjs/common';
import { VouchersService } from './services/vouchers.service';
import { VouchersController } from './controller/vouchers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Voucher, VoucherSchema } from './schemas/voucher.schema';
import { UsersModule } from '@/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Voucher.name,
        schema: VoucherSchema,
      },
    ]),
    forwardRef(() => UsersModule),
  ],
  providers: [VouchersService],
  controllers: [VouchersController],
  exports: [VouchersService],
})
export class VouchersModule {} 