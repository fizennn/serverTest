import { Module } from '@nestjs/common';
import { PayOSService } from './services/payOS.service';
import { PayOSController } from './controller/payOS.controller';

@Module({
  imports: [],
  controllers: [PayOSController],
  providers: [PayOSService],
})
export class PayOSModule {} 