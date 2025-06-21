import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { connectDB } from '../utils/config';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';
import { CommandModule } from 'nestjs-command';
import { CartModule } from '../cart/cart.module';
import { OrderModule } from '../orders/order.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { MailModule } from '../mail/mail.module';
import { UploadModule } from '@/upload/upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: connectDB,
    }),
    CommandModule,
    ProductsModule,
    UsersModule,
    CartModule,
    OrderModule,
    VouchersModule,
    UploadModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}