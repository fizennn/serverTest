import { Module } from '@nestjs/common';
import { ChatbotService } from './services/chatbot.service';
import { ChatbotController } from './controller/chatbot.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatHistory, ChatHistorySchema } from './schemas/chat-history.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { AppService } from '@/app/services/app.service';
import { InventoryCheckerService } from './services/inventory-checker.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: ChatHistory.name,
        schema: ChatHistorySchema,
      },
      {
        name: Product.name,
        schema: ProductSchema,
      },
    ]),
  ],
  providers: [ChatbotService, AppService, InventoryCheckerService],
  controllers: [ChatbotController],
  exports: [ChatbotService, MongooseModule],
})
export class ChatbotModule {} 