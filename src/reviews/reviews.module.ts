import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsService } from './services/reviews.service';
import { ReviewsController } from './controller/reviews.controller';
import { Review, ReviewSchema } from './schemas/review.schema';
import { UsersModule } from '@/users/users.module';
import { ProductsModule } from '@/products/products.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }]),
    UsersModule,
    ProductsModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {} 