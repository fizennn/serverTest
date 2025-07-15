import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatHistory, ChatMessage } from '../schemas/chat-history.schema';
import { SendMessageDto, CreateConversationDto, ChatResponseDto, ChatHistoryDto } from '../dtos/chat.dto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { InventoryCheckerService } from './inventory-checker.service';

@Injectable()
export class ChatbotService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(
    @InjectModel(ChatHistory.name) private chatHistoryModel: Model<ChatHistory>,
    private configService: ConfigService,
    private inventoryCheckerService: InventoryCheckerService,
  ) {
    // Khởi tạo Gemini API
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not configured - chatbot will use fallback responses');
      this.genAI = null;
      this.model = null;
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
  }

  /**
   * Tạo cuộc hội thoại mới
   */
  async createConversation(userId: string, createConversationDto: CreateConversationDto): Promise<ChatHistoryDto & { type?: string; data?: any }> {
    try {
      // Tạo tin nhắn đầu tiên từ user
      const userMessage: ChatMessage = {
        role: 'user',
        content: createConversationDto.initialMessage,
        timestamp: new Date(),
      };

      // Gọi Gemini API để lấy câu trả lời
      const assistantResponse = await this.generateResponse([userMessage]);

      // Tạo tin nhắn từ model
      const assistantMessage: ChatMessage = {
        role: 'model',
        content: assistantResponse.response,
        timestamp: new Date(),
      };

      // Tạo cuộc hội thoại mới
      const conversation = new this.chatHistoryModel({
        user: userId,
        title: createConversationDto.title,
        messages: [userMessage, assistantMessage],
        isActive: true,
        startedAt: new Date(),
      });

      const savedConversation = await conversation.save();
      const result = this.mapToDto(savedConversation);
      
      // Thêm type và data cho mobile app
      return {
        ...result,
        type: assistantResponse.type,
        data: assistantResponse.data,
      };
    } catch (error) {
      throw new HttpException(
        `Lỗi khi tạo cuộc hội thoại: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Gửi tin nhắn và nhận câu trả lời
   */
  async sendMessage(userId: string, sendMessageDto: SendMessageDto): Promise<ChatResponseDto> {
    try {
      let conversation: any;

      if (sendMessageDto.conversationId) {
        // Tìm cuộc hội thoại hiện tại
        conversation = await this.chatHistoryModel.findOne({
          _id: sendMessageDto.conversationId,
          user: userId,
          isActive: true,
        });

        if (!conversation) {
          throw new HttpException('Không tìm thấy cuộc hội thoại', HttpStatus.NOT_FOUND);
        }
      } else {
        // Tạo cuộc hội thoại mới nếu không có conversationId
        const userMessage: ChatMessage = {
          role: 'user',
          content: sendMessageDto.message,
          timestamp: new Date(),
        };

        const assistantResponse = await this.generateResponse([userMessage]);
        const assistantMessage: ChatMessage = {
          role: 'model',
          content: assistantResponse.response,
          timestamp: new Date(),
        };

        conversation = new this.chatHistoryModel({
          user: userId,
          title: this.generateTitle(sendMessageDto.message),
          messages: [userMessage, assistantMessage],
          isActive: true,
          startedAt: new Date(),
        });

        await conversation.save();
      }

      // Thêm tin nhắn mới từ user
      const userMessage: ChatMessage = {
        role: 'user',
        content: sendMessageDto.message,
        timestamp: new Date(),
      };

      conversation.messages.push(userMessage);

      // Gọi Gemini API với toàn bộ lịch sử chat
      const assistantResponse = await this.generateResponse(conversation.messages);

      // Thêm câu trả lời từ model
      const assistantMessage: ChatMessage = {
        role: 'model',
        content: assistantResponse.response,
        timestamp: new Date(),
      };

      conversation.messages.push(assistantMessage);
      await conversation.save();

      return {
        conversationId: conversation._id.toString(),
        response: assistantResponse.response,
        timestamp: new Date(),
        type: assistantResponse.type,
        data: assistantResponse.data,
      };
    } catch (error) {
      throw new HttpException(
        `Lỗi khi gửi tin nhắn: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Lấy lịch sử chat của user
   */
  async getChatHistory(userId: string): Promise<ChatHistoryDto[]> {
    try {
      const conversations = await this.chatHistoryModel
        .find({ user: userId })
        .sort({ updatedAt: -1 })
        .exec();

      // Migrate dữ liệu cũ nếu cần
      for (const conversation of conversations) {
        let needsUpdate = false;
        conversation.messages = conversation.messages.map(message => {
          if (message.role === 'assistant') {
            needsUpdate = true;
            return { ...message, role: 'model' };
          }
          return message;
        });

        if (needsUpdate) {
          await conversation.save();
        }
      }

      return conversations.map(conversation => this.mapToDto(conversation));
    } catch (error) {
      throw new HttpException(
        `Lỗi khi lấy lịch sử chat: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Lấy chi tiết một cuộc hội thoại
   */
  async getConversation(userId: string, conversationId: string): Promise<ChatHistoryDto> {
    try {
      const conversation = await this.chatHistoryModel.findOne({
        _id: conversationId,
        user: userId,
      });

      if (!conversation) {
        throw new HttpException('Không tìm thấy cuộc hội thoại', HttpStatus.NOT_FOUND);
      }

      // Migrate dữ liệu cũ nếu cần
      let needsUpdate = false;
      conversation.messages = conversation.messages.map(message => {
        if (message.role === 'assistant') {
          needsUpdate = true;
          return { ...message, role: 'model' };
        }
        return message;
      });

      if (needsUpdate) {
        await conversation.save();
      }

      return this.mapToDto(conversation);
    } catch (error) {
      throw new HttpException(
        `Lỗi khi lấy cuộc hội thoại: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Kết thúc cuộc hội thoại
   */
  async endConversation(userId: string, conversationId: string): Promise<void> {
    try {
      const conversation = await this.chatHistoryModel.findOne({
        _id: conversationId,
        user: userId,
        isActive: true,
      });

      if (!conversation) {
        throw new HttpException('Không tìm thấy cuộc hội thoại', HttpStatus.NOT_FOUND);
      }

      conversation.isActive = false;
      conversation.endedAt = new Date();
      await conversation.save();
    } catch (error) {
      throw new HttpException(
        `Lỗi khi kết thúc cuộc hội thoại: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Xóa cuộc hội thoại
   */
  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    try {
      const result = await this.chatHistoryModel.deleteOne({
        _id: conversationId,
        user: userId,
      });

      if (result.deletedCount === 0) {
        throw new HttpException('Không tìm thấy cuộc hội thoại', HttpStatus.NOT_FOUND);
      }
    } catch (error) {
      throw new HttpException(
        `Lỗi khi xóa cuộc hội thoại: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Thêm hàm kiểm tra câu hỏi tồn kho bằng AI
  private async isInventoryQueryByAI(message: string): Promise<boolean> {
    if (!this.model) return false;
    const prompt = `Câu sau đây có phải là hỏi về kiểm tra tồn kho sản phẩm không? Nếu đúng, chỉ trả lời YES. Nếu không, chỉ trả lời NO. Không giải thích thêm. Câu: "${message}"`;
    try {
      console.log('[AI Inventory Check] Prompt:', prompt);
      const chat = this.model.startChat({ history: [] });
      const result = await Promise.race([
        chat.sendMessage(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
      ]);
      const response = await result.response;
      console.log('[AI Inventory Check] Raw AI response:', response.text());
      const answer = response.text().split('\n')[0].trim().toUpperCase();
      console.log('[AI Inventory Check] Final answer:', answer);
      return answer === 'YES';
    } catch (error) {
      console.error('Lỗi khi kiểm tra inventory query bằng AI:', error.message);
      return false;
    }
  }

  // Hàm dùng AI để trích xuất tên sản phẩm
  private async extractProductNameByAI(message: string): Promise<string | null> {
    if (!this.model) return null;
    const prompt = `Trong câu sau, hãy trích xuất tên sản phẩm mà người dùng muốn hỏi. Chỉ trả về tên sản phẩm, không giải thích. Nếu không có tên sản phẩm, trả về rỗng. Câu: "${message}"`;
    try {
      console.log('[AI Product Extract] Prompt:', prompt);
      const chat = this.model.startChat({ history: [] });
      const result = await Promise.race([
        chat.sendMessage(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
      ]);
      const response = await result.response;
      console.log('[AI Product Extract] Raw AI response:', response.text());
      const productName = response.text().split('\n')[0].trim();
      console.log('[AI Product Extract] Final product name:', productName);
      return productName.length > 0 ? productName : null;
    } catch (error) {
      console.error('Lỗi khi trích xuất tên sản phẩm bằng AI:', error.message);
      return null;
    }
  }

  // Hàm dùng AI để trích xuất màu sắc và size
  private async extractColorAndSizeByAI(message: string): Promise<{ color: string | null, size: string | null }> {
    if (!this.model) return { color: null, size: null };
    const prompt = `Trong câu sau, hãy trích xuất màu sắc (color) và size (nếu có). Trả về kết quả dạng JSON: {\"color\": \"...\", \"size\": \"...\"}. Nếu không có thì để giá trị là null. Câu: "${message}"`;
    try {
      console.log('[AI Color/Size Extract] Prompt:', prompt);
      const chat = this.model.startChat({ history: [] });
      const result = await Promise.race([
        chat.sendMessage(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
      ]);
      const response = await result.response;
      console.log('[AI Color/Size Extract] Raw AI response:', response.text());
      // Tìm đoạn JSON đầu tiên trong kết quả trả về
      const match = response.text().match(/{[^}]+}/);
      if (match) {
        const obj = JSON.parse(match[0]);
        return {
          color: obj.color || null,
          size: obj.size || null
        };
      }
      return { color: null, size: null };
    } catch (error) {
      console.error('Lỗi khi trích xuất color/size bằng AI:', error.message);
      return { color: null, size: null };
    }
  }

  // Hàm gộp 3 API calls thành 1 để phân tích câu hỏi tồn kho
  private async analyzeInventoryQueryByAI(message: string): Promise<{
    isInventoryQuery: boolean;
    productName: string | null;
    color: string | null;
    size: string | null;
  }> {
    if (!this.model) return { isInventoryQuery: false, productName: null, color: null, size: null };
    const prompt = `Phân tích câu sau và trả về JSON:
{
  "isInventoryQuery": true/false,
  "productName": "tên sản phẩm hoặc null",
  "color": "màu sắc hoặc null",
  "size": "size hoặc null"
}
Chỉ trả về JSON, không giải thích thêm. Câu: "${message}"`;
    try {
      console.log('[AI Inventory Analysis] Prompt:', prompt);
      const chat = this.model.startChat({ history: [] });
      const result = await Promise.race([
        chat.sendMessage(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
      ]);
      const response = await result.response;
      console.log('[AI Inventory Analysis] Raw AI response:', response.text());
      // Tìm đoạn JSON đầu tiên trong kết quả trả về
      const match = response.text().match(/{[\s\S]*}/);
      if (match) {
        const obj = JSON.parse(match[0]);
        return {
          isInventoryQuery: obj.isInventoryQuery || false,
          productName: obj.productName || null,
          color: obj.color || null,
          size: obj.size || null
        };
      }
      return { isInventoryQuery: false, productName: null, color: null, size: null };
    } catch (error) {
      console.error('Lỗi khi phân tích inventory query bằng AI:', error.message);
      return { isInventoryQuery: false, productName: null, color: null, size: null };
    }
  }

  private async generateResponse(messages: ChatMessage[]): Promise<{ response: string; type?: string; data?: any }> {
    try {
      const lastMessage = messages[messages.length - 1].content;
      // Gộp 3 API calls thành 1 để phân tích câu hỏi tồn kho
      const analysis = await this.analyzeInventoryQueryByAI(lastMessage);
      console.log('[AI Inventory Analysis] Kết quả phân tích:', analysis);
      
      if (analysis.isInventoryQuery && analysis.productName) {
        console.log('[AI Inventory Check] AI xác nhận là câu hỏi tồn kho.');
        const inventoryQuery = { 
          productName: analysis.productName, 
          color: analysis.color, 
          size: analysis.size 
        };
        console.log('[AI Inventory Check] inventoryQuery tạo bởi AI:', inventoryQuery);
        const inventoryResult = await this.inventoryCheckerService.checkInventory(inventoryQuery);
        console.log('[AI Inventory Check] Kết quả checkInventory:', inventoryResult);
        
        // Trả về dữ liệu JSON cho mobile app
        if (inventoryResult.found) {
          const productData = await this.getProductDataForMobile(inventoryResult.productName);
          return {
            response: inventoryResult.message,
            type: 'inventory_check',
            data: {
              found: true,
              product: productData,
              variants: await this.getVariantsDataForMobile(inventoryResult.productName),
              totalVariants: await this.getTotalVariantsCount(inventoryResult.productName),
              hasStock: true
            }
          };
        } else {
          // Không tìm thấy sản phẩm
          return {
            response: inventoryResult.message,
            type: 'inventory_check',
            data: {
              found: false,
              productName: inventoryResult.productName,
              suggestions: await this.getProductSuggestions(inventoryResult.productName)
            }
          };
        }
      }
      // Nếu không có Gemini API, sử dụng fallback responses
      if (!this.model) {
        return { response: this.getFallbackResponse(lastMessage) };
      }
      // Chuyển đổi tin nhắn sang format của Gemini và xử lý role cũ
      const chatHistory = messages.map(msg => ({
        role: this.normalizeRole(msg.role),
        parts: [{ text: msg.content }],
      }));
      const chat = this.model.startChat({
        history: chatHistory.slice(0, -1), // Loại bỏ tin nhắn cuối cùng
      });
      // Gọi API 1 lần, không retry
      try {
        const result = await Promise.race([
          chat.sendMessage(lastMessage),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000)) // 30s timeout
        ]);
        const response = await result.response;
        return { response: response.text() };
      } catch (error) {
        console.error('Lỗi Gemini API:', error.message);
        return { response: this.getFallbackResponse(lastMessage) };
      }
    } catch (error) {
      console.error('Lỗi khi gọi Gemini API:', error);
      return { response: this.getFallbackResponse(messages[messages.length - 1].content) };
    }
  }

  /**
   * Trả về câu trả lời mặc định khi không có Gemini
   */
  private getFallbackResponse(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('xin chào') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'Xin chào! Tôi có thể giúp gì cho bạn? Bạn có thể hỏi về sản phẩm, kiểm tra tồn kho hoặc các vấn đề khác.';
    }
    
    if (lowerMessage.includes('cảm ơn') || lowerMessage.includes('thank')) {
      return 'Không có gì! Nếu cần thêm hỗ trợ, đừng ngại hỏi nhé!';
    }
    
    if (lowerMessage.includes('giá') || lowerMessage.includes('price') || lowerMessage.includes('bao nhiêu')) {
      return 'Để biết thông tin về giá sản phẩm, bạn có thể hỏi cụ thể tên sản phẩm và tôi sẽ kiểm tra tồn kho và giá cho bạn.';
    }
    
    if (lowerMessage.includes('giao hàng') || lowerMessage.includes('shipping') || lowerMessage.includes('delivery')) {
      return 'Chúng tôi cung cấp dịch vụ giao hàng toàn quốc. Thời gian giao hàng từ 2-5 ngày tùy theo địa điểm.';
    }
    
    return 'Xin lỗi, tôi đang gặp sự cố với dịch vụ AI. Bạn có thể thử hỏi về sản phẩm cụ thể để tôi kiểm tra tồn kho, hoặc liên hệ hỗ trợ trực tiếp.';
  }

  /**
   * Chuẩn hóa role từ dữ liệu cũ
   */
  private normalizeRole(role: string): string {
    if (role === 'assistant') {
      return 'model';
    }
    return role;
  }

  /**
   * Tạo tiêu đề cho cuộc hội thoại từ tin nhắn đầu tiên
   */
  private generateTitle(message: string): string {
    const words = message.split(' ');
    if (words.length <= 5) {
      return message;
    }
    return words.slice(0, 5).join(' ') + '...';
  }

  /**
   * Chuyển đổi document thành DTO
   */
  private mapToDto(conversation: any): ChatHistoryDto {
    return {
      _id: conversation._id.toString(),
      title: conversation.title,
      messages: conversation.messages,
      isActive: conversation.isActive,
      startedAt: conversation.startedAt,
      endedAt: conversation.endedAt,
    };
  }

  // Hàm lấy dữ liệu sản phẩm cho mobile app
  private async getProductDataForMobile(productName: string): Promise<any> {
    try {
      const products = await this.inventoryCheckerService.productModel.find({ status: true });
      const searchName = this.inventoryCheckerService.removeVietnameseTones(productName).toLowerCase();
      let matchedProducts = products.filter(p =>
        this.inventoryCheckerService.removeVietnameseTones(p.name).toLowerCase().includes(searchName)
      );
      
      if (matchedProducts.length === 0) {
        // Fuzzy search
        let minDistance = Infinity;
        let bestProduct = null;
        for (const p of products) {
          const dist = this.inventoryCheckerService.levenshtein(
            this.inventoryCheckerService.removeVietnameseTones(p.name).toLowerCase(), 
            searchName
          );
          if (dist < minDistance) {
            minDistance = dist;
            bestProduct = p;
          }
        }
        if (bestProduct && minDistance <= 2) {
          matchedProducts.push(bestProduct);
        }
      }

      if (matchedProducts.length > 0) {
        const product = matchedProducts[0];
        return {
          id: product._id.toString(),
          name: product.name,
          brand: product.brand,
          images: product.images,
          description: product.description,
          averagePrice: product.averagePrice,
          rating: product.rating,
          numReviews: product.numReviews
        };
      }
      return null;
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu sản phẩm:', error);
      return null;
    }
  }

  // Hàm lấy dữ liệu variants cho mobile app
  private async getVariantsDataForMobile(productName: string): Promise<any[]> {
    try {
      const products = await this.inventoryCheckerService.productModel.find({ status: true });
      const searchName = this.inventoryCheckerService.removeVietnameseTones(productName).toLowerCase();
      let matchedProducts = products.filter(p =>
        this.inventoryCheckerService.removeVietnameseTones(p.name).toLowerCase().includes(searchName)
      );
      
      if (matchedProducts.length === 0) {
        // Fuzzy search
        let minDistance = Infinity;
        let bestProduct = null;
        for (const p of products) {
          const dist = this.inventoryCheckerService.levenshtein(
            this.inventoryCheckerService.removeVietnameseTones(p.name).toLowerCase(), 
            searchName
          );
          if (dist < minDistance) {
            minDistance = dist;
            bestProduct = p;
          }
        }
        if (bestProduct && minDistance <= 2) {
          matchedProducts.push(bestProduct);
        }
      }

      if (matchedProducts.length > 0) {
        const product = matchedProducts[0];
        return product.variants.map(variant => ({
          color: variant.color,
          image: variant.image,
          sizes: variant.sizes.map(size => ({
            size: size.size,
            stock: size.stock,
            price: size.price,
            available: size.stock > 0
          }))
        }));
      }
      return [];
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu variants:', error);
      return [];
    }
  }

  // Hàm đếm tổng số variants có hàng
  private async getTotalVariantsCount(productName: string): Promise<number> {
    try {
      const variants = await this.getVariantsDataForMobile(productName);
      let count = 0;
      for (const variant of variants) {
        for (const size of variant.sizes) {
          if (size.available) count++;
        }
      }
      return count;
    } catch (error) {
      console.error('Lỗi khi đếm variants:', error);
      return 0;
    }
  }

  // Hàm lấy gợi ý sản phẩm khi không tìm thấy
  private async getProductSuggestions(searchName: string): Promise<string[]> {
    try {
      const products = await this.inventoryCheckerService.productModel.find({ status: true });
      const suggestions = products
        .filter(p => p.name.toLowerCase().includes(searchName.toLowerCase().split(' ')[0]))
        .slice(0, 3)
        .map(p => p.name);
      return suggestions;
    } catch (error) {
      console.error('Lỗi khi lấy gợi ý sản phẩm:', error);
      return [];
    }
  }
} 