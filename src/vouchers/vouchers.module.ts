import { Module } from '@nestjs/common';
import { VouchersService } from './services/vouchers.service';
import { VouchersController } from './controller/vouchers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Voucher, VoucherSchema } from './schemas/voucher.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Voucher.name,
        schema: VoucherSchema,
      },
    ]),
  ],
  providers: [VouchersService],
  controllers: [VouchersController],
  exports: [VouchersService],
})
export class VouchersModule {} 