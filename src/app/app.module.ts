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
import { PostsModule } from '@/post/post.module';
import { BannersModule } from '@/banner/banner.module';
import { WebhookModule } from '@/webhooks/webhooks.module';
import { CategoryModule } from '@/category/category.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { AnalyticsModule } from '@/analytics/analytics.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { PayOSModule } from '../payOS/payOS.module';
import { ReturnOrdersModule } from '@/return-orders/return-orders.module';
import { NotificationModule } from '@/notifications/notifications.module';

import { StripeModule } from '../stripe/stripe.module';
import { PermissionGuard } from '../guards/permission.guard';

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
    AnalyticsModule,
    UsersModule,
    CartModule,
    OrderModule,
    VouchersModule,
    UploadModule,
    MailModule,
    CategoryModule,
    PostsModule,
    BannersModule,
    WebhookModule,
    ReviewsModule,
    ChatbotModule,
    PayOSModule,
    ReturnOrdersModule,
    StripeModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [AppService, PermissionGuard],
})
export class AppModule {}
