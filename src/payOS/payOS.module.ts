import { Module } from '@nestjs/common';
import { PayOSService } from './services/payOS.service';
import { PayOSController } from './controller/payOS.controller';

@Module({
  controllers: [PayOSController],
  providers: [PayOSService],
  exports: [PayOSService],
})
export class PayOSModule {} 