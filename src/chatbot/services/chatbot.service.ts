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
  async createConversation(userId: string, createConversationDto: CreateConversationDto): Promise<ChatHistoryDto & { type?: string; dataId?: string; productData?: any }> {
    try {
      // Tạo tin nhắn đầu tiên từ user
      const userMessage: ChatMessage = {
        role: 'user',
        content: createConversationDto.initialMessage,
        timestamp: new Date(),
      };

      // Gọi Gemini API để lấy câu trả lời
      const assistantResponse = await this.generateResponse([userMessage]);

      // Lấy dữ liệu product nếu type là inventory_check và có dataId
      let productData = null;
      if (assistantResponse.type === 'inventory_check' && assistantResponse.dataId) {
        productData = await this.getProductById(assistantResponse.dataId);
      }

      // Tạo tin nhắn từ model
      const assistantMessage: ChatMessage = {
        role: 'model',
        content: assistantResponse.response,
        timestamp: new Date(),
        type: assistantResponse.type || 'general',
        dataId: assistantResponse.dataId || null,
        productData: productData,
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
      
      // Thêm type và dataId cho mobile app (productData đã có trong message)
      return {
        ...result,
        type: assistantResponse.type,
        dataId: assistantResponse.dataId,
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
        // Lấy dữ liệu product nếu type là inventory_check và có dataId
        let productData = null;
        if (assistantResponse.type === 'inventory_check' && assistantResponse.dataId) {
          productData = await this.getProductById(assistantResponse.dataId);
        }

        const assistantMessage: ChatMessage = {
          role: 'model',
          content: assistantResponse.response,
          timestamp: new Date(),
          type: assistantResponse.type ?? null,
          dataId: assistantResponse.dataId ?? null,
          productData: productData,
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

      // Lấy dữ liệu product nếu type là inventory_check và có dataId
      let productData = null;
      if (assistantResponse.type === 'inventory_check' && assistantResponse.dataId) {
        productData = await this.getProductById(assistantResponse.dataId);
      }

      // Thêm câu trả lời từ model
      const assistantMessage: ChatMessage = {
        role: 'model',
        content: assistantResponse.response,
        timestamp: new Date(),
        type: assistantResponse.type ?? null,
        dataId: assistantResponse.dataId ?? null,
        productData: productData,
      };

      console.log('[DEBUG] Assistant message to save:', JSON.stringify(assistantMessage, null, 2));
      console.log('[DEBUG] Assistant response type:', assistantResponse.type);
      console.log('[DEBUG] Assistant response dataId:', assistantResponse.dataId);
      console.log('[DEBUG] Product data to save:', productData);
      
      conversation.messages.push(assistantMessage);
      
      // Lưu conversation và kiểm tra lại
      await conversation.save();
      
      // Đọc lại từ database để kiểm tra
      const savedConversation = await this.chatHistoryModel.findById(conversation._id);
      const lastSavedMessage = savedConversation.messages[savedConversation.messages.length - 1];
      console.log('[DEBUG] Last saved message from DB:', {
        type: lastSavedMessage.type,
        dataId: lastSavedMessage.dataId,
        productData: lastSavedMessage.productData,
        hasProductData: !!lastSavedMessage.productData
      });
      
      console.log('[DEBUG] Conversation saved with messages:', conversation.messages.length);
      console.log('[DEBUG] Last message in conversation:', conversation.messages[conversation.messages.length - 1]);
      console.log('[DEBUG] Last message type:', conversation.messages[conversation.messages.length - 1]?.type);
      console.log('[DEBUG] Last message dataId:', conversation.messages[conversation.messages.length - 1]?.dataId);
      console.log('[DEBUG] Last message productData:', conversation.messages[conversation.messages.length - 1]?.productData);

      const response = {
        conversationId: conversation._id.toString(),
        response: assistantResponse.response,
        timestamp: new Date(),
        type: assistantResponse.type ?? null,
        dataId: assistantResponse.dataId ?? null,
        productData: assistantMessage.productData, // Lấy từ message đã lưu
      };
      console.log('[DEBUG] Final response:', response);
      return response;
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

      // Debug: Kiểm tra dữ liệu từ database
      console.log('[DEBUG] Raw conversation from DB:', JSON.stringify(conversation, null, 2));
      console.log('[DEBUG] Messages from DB:', conversation.messages);
      
      // Kiểm tra từng message có type inventory_check
      for (let i = 0; i < conversation.messages.length; i++) {
        const msg = conversation.messages[i];
        if (msg.type === 'inventory_check' && msg.dataId) {
          console.log(`[DEBUG] Message ${i} has inventory_check type:`, {
            type: msg.type,
            dataId: msg.dataId,
            productData: msg.productData,
            productDataType: typeof msg.productData
          });
          
          // Nếu productData bị null nhưng có dataId, thử lấy lại
          if (!msg.productData && msg.dataId) {
            console.log(`[DEBUG] ProductData is null for message ${i}, trying to fetch again...`);
            const freshProductData = await this.getProductById(msg.dataId);
            console.log(`[DEBUG] Fresh product data:`, freshProductData);
            if (freshProductData) {
              msg.productData = freshProductData;
              console.log(`[DEBUG] Updated message ${i} with fresh product data`);
            }
          }
        }
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

      const result = this.mapToDto(conversation);
      console.log('[DEBUG] Final mapped result:', JSON.stringify(result, null, 2));
      return result;
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

  // Hàm phân tích inventory query với context từ cuộc hội thoại
  private async analyzeInventoryQueryByAIWithContext(context: string, currentMessage: string): Promise<{
    isInventoryQuery: boolean;
    isNextProductRequest: boolean;
    productName: string | null;
    color: string | null;
    size: string | null;
  }> {
    if (!this.model) return { isInventoryQuery: false, isNextProductRequest: false, productName: null, color: null, size: null };
    
    const prompt = `Dựa trên context cuộc hội thoại sau, phân tích câu hỏi cuối cùng và trả về JSON:

Context cuộc hội thoại:
${context}

Phân tích câu hỏi cuối cùng và trả về JSON:
{
  "isInventoryQuery": true/false,
  "isNextProductRequest": true/false,
  "productName": "tên sản phẩm hoặc null",
  "color": "màu sắc hoặc null", 
  "size": "size hoặc null"
}

Lưu ý:
- isInventoryQuery: true nếu là câu hỏi về tồn kho sản phẩm
- isNextProductRequest: true nếu người dùng muốn xem sản phẩm khác với các từ khóa:
  * "không thích" + "tìm khác" / "cái khác" / "sản phẩm khác"
  * "tìm khác" / "cái khác" / "sản phẩm khác" / "váy khác" / "áo khác" / "quần khác"
  * "không muốn" + "cái khác"
  * "không phù hợp" + "tìm khác"
- Nếu isNextProductRequest = true, productName sẽ là tên sản phẩm từ context trước đó

Chỉ trả về JSON, không giải thích thêm.`;
    
    try {
      console.log('[AI Inventory Analysis with Context] Prompt:', prompt);
      const chat = this.model.startChat({ history: [] });
      const result = await Promise.race([
        chat.sendMessage(prompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
      ]);
      const response = await result.response;
      console.log('[AI Inventory Analysis with Context] Raw AI response:', response.text());
      
      // Tìm đoạn JSON đầu tiên trong kết quả trả về
      const match = response.text().match(/{[\s\S]*}/);
      if (match) {
        const obj = JSON.parse(match[0]);
        return {
          isInventoryQuery: obj.isInventoryQuery || false,
          isNextProductRequest: obj.isNextProductRequest || false,
          productName: obj.productName || null,
          color: obj.color || null,
          size: obj.size || null
        };
      }
      return { isInventoryQuery: false, isNextProductRequest: false, productName: null, color: null, size: null };
    } catch (error) {
      console.error('Lỗi khi phân tích inventory query với context bằng AI:', error.message);
      return { isInventoryQuery: false, isNextProductRequest: false, productName: null, color: null, size: null };
    }
  }

  // Hàm trích xuất tên sản phẩm từ context cuộc hội thoại
  private extractProductFromContext(messages: ChatMessage[]): string | null {
    try {
      // Tìm trong các tin nhắn trước đó có chứa tên sản phẩm
      const productKeywords = ['áo', 'quần', 'giày', 'túi', 'mũ', 'nón', 'váy', 'đầm', 'sơ mi', 'jeans', 'sneaker', 'boots'];
      
      // Tìm trong cả tin nhắn của user và bot
      for (let i = messages.length - 2; i >= 0; i--) {
        const message = messages[i];
        const content = message.content.toLowerCase();
        
        // Tìm từ khóa sản phẩm trong tin nhắn
        for (const keyword of productKeywords) {
          if (content.includes(keyword)) {
            // Trích xuất cụm từ chứa từ khóa
            const words = message.content.split(' ');
            for (let j = 0; j < words.length; j++) {
              if (words[j].toLowerCase().includes(keyword)) {
                // Lấy 2-3 từ xung quanh để có tên sản phẩm đầy đủ
                const start = Math.max(0, j - 1);
                const end = Math.min(words.length, j + 3);
                const productName = words.slice(start, end).join(' ');
                console.log('[Context Extract] Tìm thấy sản phẩm từ context:', productName);
                return productName;
              }
            }
          }
        }
      }
      
      // Nếu không tìm thấy từ khóa, thử tìm trong response của bot (có thể chứa tên sản phẩm)
      for (let i = messages.length - 2; i >= 0; i--) {
        const message = messages[i];
        if (message.role === 'model' && message.content.includes('✅')) {
          // Tìm tên sản phẩm trong response của bot
          const content = message.content;
          const productMatch = content.match(/✅\s*([^,]+?)(?:\s+size|\s+màu|\s+còn|\s+Giá|$)/);
          if (productMatch) {
            const productName = productMatch[1].trim();
            console.log('[Context Extract] Tìm thấy sản phẩm từ bot response:', productName);
            return productName;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Lỗi khi trích xuất sản phẩm từ context:', error);
      return null;
    }
  }

  private async generateResponse(messages: ChatMessage[]): Promise<{ response: string; type?: string; dataId?: string }> {
    try {
      const lastMessage = messages[messages.length - 1].content;
      
      // Tạo context từ lịch sử chat để phân tích tốt hơn
      let contextForAnalysis = lastMessage;
      if (messages.length > 1) {
        const contextMessages = messages.slice(-4); // Lấy 4 tin nhắn gần nhất để phân tích
        contextForAnalysis = contextMessages.map(msg => 
          `${msg.role === 'user' ? 'Khách hàng' : 'Trợ lý'}: ${msg.content}`
        ).join('\n');
      }
      
      // Gộp 3 API calls thành 1 để phân tích câu hỏi tồn kho với context
      const analysis = await this.analyzeInventoryQueryByAIWithContext(contextForAnalysis, lastMessage);
      console.log('[AI Inventory Analysis] Kết quả phân tích:', analysis);
      console.log('[AI Inventory Analysis] isNextProductRequest:', analysis.isNextProductRequest);
      console.log('[AI Inventory Analysis] isInventoryQuery:', analysis.isInventoryQuery);
      
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
            dataId: productData?.id || null,
          };
        } else {
          // Không tìm thấy sản phẩm
          return {
            response: inventoryResult.message,
            type: 'inventory_check',
            dataId: null,
          };
        }
      } else if (analysis.isInventoryQuery && !analysis.productName) {
        // Nếu AI xác nhận là inventory query nhưng không tìm thấy tên sản phẩm
        // Thử tìm sản phẩm từ context trước đó
        const productFromContext = this.extractProductFromContext(messages);
        if (productFromContext) {
          console.log('[AI Inventory Check] Tìm thấy sản phẩm từ context:', productFromContext);
          const inventoryQuery = { 
            productName: productFromContext, 
            color: analysis.color, 
            size: analysis.size 
          };
          const inventoryResult = await this.inventoryCheckerService.checkInventory(inventoryQuery);
          
          if (inventoryResult.found) {
            const productData = await this.getProductDataForMobile(inventoryResult.productName);
            return {
              response: inventoryResult.message,
              type: 'inventory_check',
              dataId: productData?.id || null,
            };
          }
        }
        
        // Nếu vẫn không tìm thấy, trả về thông báo lỗi
        return {
          response: 'Xin lỗi, tôi không hiểu rõ bạn muốn kiểm tra sản phẩm nào. Bạn có thể nói rõ tên sản phẩm không?',
          type: 'inventory_check',
          dataId: null,
        };
      }
      
      // Xử lý yêu cầu tìm sản phẩm khác
      if (analysis.isNextProductRequest) {
        console.log('[AI Next Product Request] AI xác nhận là yêu cầu tìm sản phẩm khác.');
        
        // Tìm sản phẩm từ context trước đó
        const productFromContext = this.extractProductFromContext(messages);
        console.log('[AI Next Product Request] Kết quả extractProductFromContext:', productFromContext);
        if (productFromContext) {
          console.log('[AI Next Product Request] Tìm thấy sản phẩm từ context:', productFromContext);
          
          // Tìm sản phẩm tiếp theo với logic mới
          const nextProductResult = await this.findNextProduct(productFromContext, messages);
          
          if (nextProductResult.found) {
            const productData = await this.getProductDataForMobile(nextProductResult.productName);
            return {
              response: nextProductResult.message,
              type: 'inventory_check',
              dataId: productData?.id || null,
            };
          } else {
            return {
              response: nextProductResult.message,
              type: 'inventory_check',
              dataId: null,
            };
          }
        } else {
          return {
            response: 'Xin lỗi, tôi không thể tìm thấy sản phẩm nào khác. Bạn có thể nói rõ tên sản phẩm không?',
            type: 'inventory_check',
            dataId: null,
          };
        }
      }
      
      // Fallback: Kiểm tra thủ công nếu AI không nhận diện được next product request
      const lowerMessage = lastMessage.toLowerCase();
      const isNextProductKeywords = ['không thích', 'tìm khác', 'cái khác', 'sản phẩm khác', 'không muốn', 'không phù hợp'];
      const hasNextProductKeyword = isNextProductKeywords.some(keyword => lowerMessage.includes(keyword));
      
      if (hasNextProductKeyword && !analysis.isNextProductRequest) {
        console.log('[Fallback Next Product] Phát hiện từ khóa next product thủ công');
        
        // Tìm sản phẩm từ context trước đó
        const productFromContext = this.extractProductFromContext(messages);
        console.log('[Fallback Next Product] Kết quả extractProductFromContext:', productFromContext);
        
        if (productFromContext) {
          console.log('[Fallback Next Product] Tìm thấy sản phẩm từ context:', productFromContext);
          
          // Tìm sản phẩm tiếp theo với logic mới
          const nextProductResult = await this.findNextProduct(productFromContext, messages);
          
          if (nextProductResult.found) {
            const productData = await this.getProductDataForMobile(nextProductResult.productName);
            return {
              response: nextProductResult.message,
              type: 'inventory_check',
              dataId: productData?.id || null,
            };
          } else {
            return {
              response: nextProductResult.message,
              type: 'inventory_check',
              dataId: null,
            };
          }
        } else {
          return {
            response: 'Xin lỗi, tôi không thể tìm thấy sản phẩm nào khác. Bạn có thể nói rõ tên sản phẩm không?',
            type: 'inventory_check',
            dataId: null,
          };
        }
      }
      
      // Nếu không có Gemini API, sử dụng fallback responses
      if (!this.model) {
        return { 
          response: this.getFallbackResponse(lastMessage, messages),
          type: 'general',
          dataId: null,
        };
      }

      // Tạo system prompt để chatbot biết vai trò của mình
      const systemPrompt = `Bạn là trợ lý AI của cửa hàng thời trang Drezzup. Bạn có thể:
- Trả lời các câu hỏi về sản phẩm, giá cả, chính sách
- Hỗ trợ khách hàng về thông tin giao hàng, đổi trả
- Giải thích về các chương trình khuyến mãi, voucher
- Đưa ra gợi ý sản phẩm phù hợp
- Hãy trả lời một cách thân thiện, chuyên nghiệp và hữu ích
- Nếu không biết thông tin cụ thể, hãy đề xuất khách hàng liên hệ trực tiếp

Hãy nhớ context của cuộc hội thoại trước đó và trả lời phù hợp.`;

      // Tạo chat với system prompt
      const chat = this.model.startChat({
        generationConfig: {
          temperature: 0.7,
        },
      });

      try {
        // Gửi system prompt
        await chat.sendMessage(systemPrompt);
        
        // Nếu có lịch sử chat, gửi context trước
        if (messages.length > 1) {
          const contextMessages = messages.slice(0, -1);
          const contextText = contextMessages.map(msg => 
            `${msg.role === 'user' ? 'Khách hàng' : 'Trợ lý'}: ${msg.content}`
          ).join('\n');
          
          await chat.sendMessage(`Đây là lịch sử cuộc hội thoại trước đó:\n${contextText}\n\nBây giờ khách hàng hỏi tiếp:`);
        }
        
        // Gửi tin nhắn cuối cùng của user
        const result = await Promise.race([
          chat.sendMessage(lastMessage),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000)) // 30s timeout
        ]);
        
        const response = await result.response;
        return { 
          response: response.text(),
          type: 'general',
          dataId: null,
        };
              } catch (error) {
          console.error('Lỗi Gemini API:', error.message);
          return { 
            response: this.getFallbackResponse(lastMessage, messages),
            type: 'general',
            dataId: null,
          };
        }
    } catch (error) {
      console.error('Lỗi khi gọi Gemini API:', error);
      return { 
        response: this.getFallbackResponse(messages[messages.length - 1].content, messages),
        type: 'general',
        dataId: null,
      };
    }
  }

  /**
   * Trả về câu trả lời mặc định khi không có Gemini
   */
  private getFallbackResponse(message: string, messages?: ChatMessage[]): string {
    const lowerMessage = message.toLowerCase();
    
    // Nếu có lịch sử chat, thêm context
    let contextInfo = '';
    if (messages && messages.length > 1) {
      const recentMessages = messages.slice(-4); // Lấy 4 tin nhắn gần nhất
      contextInfo = `\n\nDựa trên cuộc hội thoại trước đó, `;
    }
    
    if (lowerMessage.includes('xin chào') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return 'Xin chào! Tôi là trợ lý AI của cửa hàng thời trang Drezzup. Tôi có thể giúp gì cho bạn? Bạn có thể hỏi về sản phẩm, kiểm tra tồn kho hoặc các vấn đề khác.';
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
    
    if (lowerMessage.includes('bạn là ai') || lowerMessage.includes('tên gì')) {
      return 'Tôi là trợ lý AI của cửa hàng thời trang Drezzup. Tôi có thể giúp bạn tìm hiểu về sản phẩm, kiểm tra tồn kho, và hỗ trợ các vấn đề khác.';
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
    console.log('[DEBUG] Mapping conversation to DTO:', {
      id: conversation._id.toString(),
      messagesCount: conversation.messages?.length || 0
    });
    
    const mappedMessages = conversation.messages.map((msg: any, index: number) => {
      const mappedMsg = {
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        type: msg.type || null,
        dataId: msg.dataId || null,
        productData: msg.productData || null,
      };
      
      // Debug cho các message có type inventory_check
      if (msg.type === 'inventory_check') {
        console.log(`[DEBUG] Message ${index} inventory_check:`, {
          type: mappedMsg.type,
          dataId: mappedMsg.dataId,
          hasProductData: !!mappedMsg.productData,
          productDataKeys: mappedMsg.productData ? Object.keys(mappedMsg.productData) : null
        });
      }
      
      return mappedMsg;
    });
    
    const result = {
      _id: conversation._id.toString(),
      title: conversation.title,
      messages: mappedMessages,
      isActive: conversation.isActive,
      startedAt: conversation.startedAt,
      endedAt: conversation.endedAt,
    };
    
    console.log('[DEBUG] Mapped DTO result:', {
      id: result._id,
      messagesCount: result.messages.length,
      inventoryCheckMessages: result.messages.filter(m => m.type === 'inventory_check').length
    });
    
    return result;
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

  /**
   * Lấy thống kê về inventory checks
   */
  async getInventoryCheckAnalytics(userId: string) {
    try {
      // Lấy tất cả tin nhắn có type = 'inventory_check'
      const conversations = await this.chatHistoryModel.find({ user: userId });
      
      const inventoryMessages = [];
      const productStats = {};
      
             for (const conversation of conversations) {
         for (const message of conversation.messages) {
           if (message.type === 'inventory_check' && message.dataId) {
             inventoryMessages.push(message);
             
             // Thống kê theo sản phẩm
             if (!productStats[message.dataId]) {
               productStats[message.dataId] = {
                 productId: message.dataId,
                 count: 0,
                 lastChecked: message.timestamp,
                 found: false
               };
             }
             productStats[message.dataId].count++;
             if (message.timestamp > productStats[message.dataId].lastChecked) {
               productStats[message.dataId].lastChecked = message.timestamp;
             }
           }
         }
       }

      // Lấy thông tin chi tiết sản phẩm
      const productDetails = [];
      for (const [productId, stats] of Object.entries(productStats)) {
        try {
          const product = await this.inventoryCheckerService.productModel.findById(productId);
          if (product) {
            const statData = stats as any;
            productDetails.push({
              productId: statData.productId,
              count: statData.count,
              lastChecked: statData.lastChecked,
              found: statData.found,
              productName: product.name,
              brand: product.brand,
              averagePrice: product.averagePrice
            });
          }
        } catch (error) {
          console.error(`Lỗi khi lấy thông tin sản phẩm ${productId}:`, error);
        }
      }

      return {
        totalInventoryChecks: inventoryMessages.length,
        uniqueProductsChecked: Object.keys(productStats).length,
        productStats: productDetails,
        recentChecks: inventoryMessages
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10)
      };
    } catch (error) {
      throw new HttpException(
        `Lỗi khi lấy thống kê inventory checks: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Helper method để lấy productData cho tin nhắn inventory_check
  private async getProductDataForMessage(type: string, dataId: string): Promise<any> {
    if (type === 'inventory_check' && dataId) {
      return await this.getProductById(dataId);
    }
    return null;
  }

  // Public method để lấy productData cho controller
  async getProductDataForController(type: string, dataId: string): Promise<any> {
    return this.getProductDataForMessage(type, dataId);
  }

  // Hàm lấy dữ liệu product theo ID
  private async getProductById(productId: string): Promise<any> {
    try {
      console.log('[DEBUG] Getting product by ID:', productId);
      const product = await this.inventoryCheckerService.productModel.findById(productId);
      if (!product) {
        console.log('[DEBUG] Product not found for ID:', productId);
        return null;
      }
      
      console.log('[DEBUG] Found product:', {
        id: product._id.toString(),
        name: product.name,
        brand: product.brand,
        hasVariants: !!product.variants,
        variantsCount: product.variants?.length || 0
      });
      
      const productData = {
        id: product._id.toString(),
        name: product.name,
        brand: product.brand,
        images: product.images,
        description: product.description,
        averagePrice: product.averagePrice, // Đây là string theo format "min - max"
        rating: product.rating,
        numReviews: product.numReviews,
        variants: product.variants.map(variant => ({
          color: variant.color,
          image: variant.image,
          sizes: variant.sizes.map(size => ({
            size: size.size,
            stock: size.stock,
            price: size.price,
            available: size.stock > 0
          }))
        }))
      };
      
      console.log('[DEBUG] Returning product data:', {
        id: productData.id,
        name: productData.name,
        hasVariants: !!productData.variants,
        variantsCount: productData.variants?.length || 0
      });
      
      return productData;
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu sản phẩm theo ID:', error);
      return null;
    }
  }

  /**
   * Tìm sản phẩm tiếp theo dựa trên sản phẩm hiện tại và lịch sử chat
   */
  private async findNextProduct(currentProductName: string, messages: ChatMessage[]): Promise<{
    found: boolean;
    productName: string;
    message: string;
  }> {
    try {
      // Lấy tất cả sản phẩm còn hoạt động
      const products = await this.inventoryCheckerService.productModel.find({ status: true });
      
      // Chuẩn hóa tên sản phẩm hiện tại
      const currentSearchName = this.inventoryCheckerService.removeVietnameseTones(currentProductName).toLowerCase();
      
      // Tìm tất cả sản phẩm có chứa từ khóa tương tự
      const matchedProducts = products.filter(p =>
        this.inventoryCheckerService.removeVietnameseTones(p.name).toLowerCase().includes(currentSearchName)
      );

      if (matchedProducts.length === 0) {
        return {
          found: false,
          productName: currentProductName,
          message: `❌ Không tìm thấy sản phẩm "${currentProductName}" trong hệ thống.`,
        };
      }

      // Tìm sản phẩm hiện tại trong danh sách
      let currentIndex = -1;
      for (let i = 0; i < matchedProducts.length; i++) {
        if (this.inventoryCheckerService.removeVietnameseTones(matchedProducts[i].name).toLowerCase() === currentSearchName) {
          currentIndex = i;
          break;
        }
      }

      // Nếu không tìm thấy sản phẩm hiện tại, lấy sản phẩm đầu tiên
      if (currentIndex === -1) {
        currentIndex = 0;
      }

      // Lấy sản phẩm tiếp theo (hoặc quay lại đầu nếu đã hết)
      const nextIndex = (currentIndex + 1) % matchedProducts.length;
      const nextProduct = matchedProducts[nextIndex];

      // Kiểm tra tồn kho của sản phẩm tiếp theo
      const inventoryQuery = { 
        productName: nextProduct.name, 
        color: null, 
        size: null 
      };
      
      const inventoryResult = await this.inventoryCheckerService.checkInventory(inventoryQuery);
      
      if (inventoryResult.found) {
        return {
          found: true,
          productName: nextProduct.name,
          message: `🔄 Đây là sản phẩm khác: ${inventoryResult.message}`,
        };
      } else {
        // Nếu sản phẩm tiếp theo không còn hàng, thử sản phẩm sau nữa
        if (matchedProducts.length > 1) {
          const nextNextIndex = (nextIndex + 1) % matchedProducts.length;
          const nextNextProduct = matchedProducts[nextNextIndex];
          
          const nextInventoryQuery = { 
            productName: nextNextProduct.name, 
            color: null, 
            size: null 
          };
          
          const nextInventoryResult = await this.inventoryCheckerService.checkInventory(nextInventoryQuery);
          
          if (nextInventoryResult.found) {
            return {
              found: true,
              productName: nextNextProduct.name,
              message: `🔄 Đây là sản phẩm khác: ${nextInventoryResult.message}`,
            };
          }
        }
        
        return {
          found: false,
          productName: currentProductName,
          message: `❌ Không còn sản phẩm "${currentProductName}" nào khác còn hàng.`,
        };
      }
    } catch (error) {
      console.error('Lỗi khi tìm sản phẩm tiếp theo:', error);
      return {
        found: false,
        productName: currentProductName,
        message: '❌ Có lỗi xảy ra khi tìm sản phẩm khác. Vui lòng thử lại sau.',
      };
    }
  }
} 