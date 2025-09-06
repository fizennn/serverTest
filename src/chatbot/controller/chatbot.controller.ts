import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatbotService } from '../services/chatbot.service';
import { InventoryCheckerService } from '../services/inventory-checker.service';
import {
  SendMessageDto,
  CreateConversationDto,
  ChatResponseDto,
  ChatHistoryDto,
} from '../dtos/chat.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@ApiTags('Chatbot')
@Controller('chatbot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatbotController {
  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly inventoryCheckerService: InventoryCheckerService,
  ) {}

  @Post('conversations')
  @ApiOperation({ summary: 'Tạo cuộc hội thoại mới' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Cuộc hội thoại được tạo thành công',
    type: ChatHistoryDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dữ liệu không hợp lệ',
  })
  async createConversation(
    @Request() req: any,
    @Body() createConversationDto: CreateConversationDto,
  ): Promise<ChatHistoryDto & { type?: string; dataId?: string; productData?: any }> {
    return this.chatbotService.createConversation(
      req.user._id,
      createConversationDto,
    );
  }

  @Post('send-message')
  @ApiOperation({ summary: 'Gửi tin nhắn và nhận câu trả lời' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tin nhắn được gửi thành công',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dữ liệu không hợp lệ',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy cuộc hội thoại',
  })
  async sendMessage(
    @Request() req: any,
    @Body() sendMessageDto: SendMessageDto,
  ): Promise<ChatResponseDto> {
    return this.chatbotService.sendMessage(req.user._id, sendMessageDto);
  }

  @Get('conversations')
  @ApiOperation({ 
    summary: 'Lấy lịch sử chat của user',
    description: 'Mặc định trả về câu trả lời cuối cùng của mỗi cuộc hội thoại. Thêm ?type=full để lấy toàn bộ lịch sử chat.'
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Loại dữ liệu trả về: "full" để lấy toàn bộ lịch sử, mặc định lấy câu trả lời cuối cùng',
    example: 'full',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy lịch sử chat thành công',
    type: [ChatResponseDto],
  })
  async getChatHistory(
    @Request() req: any,
    @Query('type') type?: string,
  ): Promise<ChatResponseDto[] | ChatHistoryDto[]> {
    const conversations = await this.chatbotService.getChatHistory(req.user._id);
    
    // Nếu type = 'full', trả về toàn bộ lịch sử
    if (type === 'full') {
      return conversations;
    }
    
    // Mặc định trả về ChatResponseDto[] (chỉ câu trả lời cuối cùng)
    const responses: ChatResponseDto[] = [];
    
    for (const conversation of conversations) {
      if (conversation.messages && conversation.messages.length > 0) {
        // Lấy tin nhắn cuối cùng (câu trả lời từ model)
        const lastMessage = conversation.messages[conversation.messages.length - 1];
        if (lastMessage.role === 'model') {
          responses.push({
            conversationId: conversation._id,
            response: lastMessage.content,
            timestamp: lastMessage.timestamp,
            type: lastMessage.type || null,
            dataId: lastMessage.dataId || null,
            productData: lastMessage.productData || null,
          });
        }
      }
    }
    
    return responses;
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Lấy chi tiết một cuộc hội thoại' })
  @ApiParam({ name: 'id', description: 'ID cuộc hội thoại' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy chi tiết cuộc hội thoại thành công',
    type: ChatResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy cuộc hội thoại',
  })
  async getConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ): Promise<ChatResponseDto> {
    const conversation = await this.chatbotService.getConversation(req.user._id, conversationId);
    
    // Chuyển đổi từ ChatHistoryDto sang ChatResponseDto
    if (conversation.messages && conversation.messages.length > 0) {
      // Lấy tin nhắn cuối cùng (câu trả lời từ model)
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      if (lastMessage.role === 'model') {
        return {
          conversationId: conversation._id,
          response: lastMessage.content,
          timestamp: lastMessage.timestamp,
          type: lastMessage.type || null,
          dataId: lastMessage.dataId || null,
          productData: lastMessage.productData || null,
        };
      }
    }
    
    // Fallback nếu không có tin nhắn model
    return {
      conversationId: conversation._id,
      response: 'Không có câu trả lời',
      timestamp: new Date(),
      type: null,
      dataId: null,
      productData: null,
    };
  }

  @Get('conversations/:id/full')
  @ApiOperation({ summary: 'Lấy toàn bộ lịch sử chat của một cuộc hội thoại' })
  @ApiParam({ name: 'id', description: 'ID cuộc hội thoại' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy toàn bộ lịch sử chat thành công',
    type: ChatHistoryDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy cuộc hội thoại',
  })
  async getFullConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ): Promise<ChatHistoryDto & { type?: string; dataId?: string; productData?: any }> {
    const conversation = await this.chatbotService.getConversation(req.user._id, conversationId);
    
    // Lấy tin nhắn cuối cùng để kiểm tra type và dataId
    if (conversation.messages && conversation.messages.length > 0) {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      if (lastMessage.role === 'model') {
        return {
          ...conversation,
          type: lastMessage.type || null,
          dataId: lastMessage.dataId || null,
          productData: lastMessage.productData || null,
        };
      }
    }
    
    return {
      ...conversation,
      type: null,
      dataId: null,
      productData: null,
    };
  }

  @Put('conversations/:id/end')
  @ApiOperation({ summary: 'Kết thúc cuộc hội thoại' })
  @ApiParam({ name: 'id', description: 'ID cuộc hội thoại' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Kết thúc cuộc hội thoại thành công',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy cuộc hội thoại',
  })
  async endConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ): Promise<void> {
    return this.chatbotService.endConversation(req.user._id, conversationId);
  }

  @Delete('conversations/:id')
  @ApiOperation({ summary: 'Xóa cuộc hội thoại' })
  @ApiParam({ name: 'id', description: 'ID cuộc hội thoại' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Xóa cuộc hội thoại thành công',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy cuộc hội thoại',
  })
  async deleteConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ): Promise<void> {
    return this.chatbotService.deleteConversation(req.user._id, conversationId);
  }

  @Get('check-inventory')
  @ApiOperation({ summary: 'Kiểm tra tồn kho sản phẩm' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Kiểm tra tồn kho thành công',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dữ liệu không hợp lệ',
  })
  async checkInventory(
    @Query('productName') productName: string,
    @Query('color') color?: string,
    @Query('size') size?: string,
  ) {
    const result = await this.inventoryCheckerService.checkInventory({
      productName,
      color,
      size,
    });
    return result;
  }

  @Get('analytics/inventory-checks')
  @ApiOperation({ summary: 'Lấy thống kê về inventory checks' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy thống kê thành công',
  })
  async getInventoryCheckAnalytics(@Request() req: any) {
    return this.chatbotService.getInventoryCheckAnalytics(req.user._id);
  }
} 