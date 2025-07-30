# Chatbot Module

Module chatbot tích hợp với Google Gemini API để cung cấp tính năng chat thông minh cho ứng dụng.

## Cấu trúc thư mục

```
src/chatbot/
├── chatbot.module.ts           # Module chính
├── controller/
│   └── chatbot.controller.ts   # API endpoints
├── services/
│   ├── chatbot.service.ts      # Business logic
│   └── chatbot.service.spec.ts # Unit tests
├── dtos/
│   └── chat.dto.ts            # Data Transfer Objects
├── schemas/
│   └── chat-history.schema.ts # MongoDB schema
└── README.md                  # Hướng dẫn sử dụng
```

## Cài đặt

### 1. Cài đặt dependencies

```bash
npm install @google/generative-ai --legacy-peer-deps
```

### 2. Cấu hình environment variables

Thêm vào file `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Import module

Thêm `ChatbotModule` vào `app.module.ts`:

```typescript
import { ChatbotModule } from '../chatbot/chatbot.module';

@Module({
  imports: [
    // ... other modules
    ChatbotModule,
  ],
})
export class AppModule {}
```

## API Endpoints

### 1. Tạo cuộc hội thoại mới

```http
POST /chatbot/conversations
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "title": "Hỏi về sản phẩm",
  "initialMessage": "Xin chào, tôi cần hỗ trợ về sản phẩm"
}
```

### 2. Gửi tin nhắn

```http
POST /chatbot/send-message
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "message": "Tôi muốn mua áo thun",
  "conversationId": "507f1f77bcf86cd799439011" // optional
}
```

### 3. Lấy lịch sử chat

```http
GET /chatbot/conversations
Authorization: Bearer <jwt_token>
```

### 4. Lấy chi tiết cuộc hội thoại

```http
GET /chatbot/conversations/:id
Authorization: Bearer <jwt_token>
```

### 5. Kết thúc cuộc hội thoại

```http
PUT /chatbot/conversations/:id/end
Authorization: Bearer <jwt_token>
```

### 6. Xóa cuộc hội thoại

```http
DELETE /chatbot/conversations/:id
Authorization: Bearer <jwt_token>
```

### 7. Kiểm tra tồn kho sản phẩm

```http
GET /chatbot/check-inventory?productName=áo sơ mi&color=trắng&size=L
Authorization: Bearer <jwt_token>
```

## Tính năng

### 1. Tích hợp Gemini API
- Sử dụng Google Generative AI để tạo câu trả lời thông minh
- Hỗ trợ context conversation (nhớ lịch sử chat)
- Xử lý lỗi gracefully khi API không khả dụng

### 2. Kiểm tra tồn kho thông minh
- Tự động nhận diện câu hỏi về tồn kho sản phẩm
- Phân tích ngôn ngữ tự nhiên để trích xuất thông tin sản phẩm
- Hỗ trợ tìm kiếm theo tên sản phẩm, màu sắc, kích thước
- Trả về thông tin chi tiết về số lượng tồn kho và giá

### 3. Quản lý cuộc hội thoại
- Tạo cuộc hội thoại mới với tiêu đề
- Lưu trữ toàn bộ lịch sử tin nhắn
- Kết thúc cuộc hội thoại
- Xóa cuộc hội thoại

### 4. Bảo mật
- Yêu cầu JWT authentication
- Mỗi user chỉ có thể truy cập cuộc hội thoại của mình
- Validation dữ liệu đầu vào

### 4. Database Schema

#### ChatHistory
- `user`: Reference đến User
- `title`: Tiêu đề cuộc hội thoại
- `messages`: Mảng các tin nhắn
- `isActive`: Trạng thái cuộc hội thoại
- `startedAt`: Thời gian bắt đầu
- `endedAt`: Thời gian kết thúc (optional)

#### ChatMessage
- `role`: 'user' hoặc 'model'
- `content`: Nội dung tin nhắn
- `timestamp`: Thời gian gửi

## Sử dụng trong frontend

### Ví dụ với JavaScript/TypeScript:

```typescript
// Gửi tin nhắn
const sendMessage = async (message: string, conversationId?: string) => {
  const response = await fetch('/api/chatbot/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      message,
      conversationId
    })
  });
  
  return response.json();
};

// Lấy lịch sử chat
const getChatHistory = async () => {
  const response = await fetch('/api/chatbot/conversations', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};

// Kiểm tra tồn kho
const checkInventory = async (productName: string, color?: string, size?: string) => {
  const params = new URLSearchParams({ productName });
  if (color) params.append('color', color);
  if (size) params.append('size', size);
  
  const response = await fetch(`/api/chatbot/check-inventory?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.json();
};
```

### Ví dụ câu hỏi chatbot có thể hiểu:

```
"Áo sơ mi trắng size L còn hàng không?"
"Quần short đen có size M không?"
"Kiểm tra tồn kho áo thun xanh"
"Còn bao nhiêu áo khoác đen size XL?"
```

## Lưu ý

1. **API Key**: Đảm bảo có API key hợp lệ từ Google AI Studio
2. **Rate Limiting**: Gemini API có giới hạn request, cần xử lý phù hợp
3. **Error Handling**: Luôn xử lý lỗi khi gọi API bên ngoài
4. **Security**: Không expose API key trong frontend
5. **Performance**: Cân nhắc caching cho các câu trả lời phổ biến

## Troubleshooting

### Lỗi "GEMINI_API_KEY is not configured"
- Kiểm tra file `.env` có chứa `GEMINI_API_KEY`
- Restart server sau khi thêm environment variable

### Lỗi "Cannot find module '@google/generative-ai'"
- Chạy `npm install @google/generative-ai --legacy-peer-deps`
- Kiểm tra `package.json` có dependency này

### Lỗi "Invalid API key"
- Kiểm tra API key có hợp lệ không
- Đảm bảo có quyền truy cập Gemini API 