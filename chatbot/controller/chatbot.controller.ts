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
  ): Promise<ChatHistoryDto> {
    return this.chatbotService.createConversation(
      req.user.id,
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
    return this.chatbotService.sendMessage(req.user.id, sendMessageDto);
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Lấy lịch sử chat của user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy lịch sử chat thành công',
    type: [ChatHistoryDto],
  })
  async getChatHistory(@Request() req: any): Promise<ChatHistoryDto[]> {
    return this.chatbotService.getChatHistory(req.user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Lấy chi tiết một cuộc hội thoại' })
  @ApiParam({ name: 'id', description: 'ID cuộc hội thoại' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lấy chi tiết cuộc hội thoại thành công',
    type: ChatHistoryDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Không tìm thấy cuộc hội thoại',
  })
  async getConversation(
    @Request() req: any,
    @Param('id') conversationId: string,
  ): Promise<ChatHistoryDto> {
    return this.chatbotService.getConversation(req.user.id, conversationId);
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
    return this.chatbotService.endConversation(req.user.id, conversationId);
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
    return this.chatbotService.deleteConversation(req.user.id, conversationId);
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
} 