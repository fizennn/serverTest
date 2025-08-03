# Hướng dẫn đồng bộ API Chatbot

## Tổng quan
Các API chatbot đã được đồng bộ để trả về cùng một cấu trúc dữ liệu `ChatResponseDto` cho các endpoint chính.

## Cấu trúc dữ liệu đồng bộ

### ChatResponseDto
```typescript
{
  conversationId: string;      // ID cuộc hội thoại
  response: string;           // Nội dung câu trả lời
  timestamp: Date;            // Thời gian gửi tin nhắn
  type?: string;              // Loại tin nhắn (inventory_check, general, etc.)
  dataId?: string;            // ID dữ liệu được tìm thấy
}
```

## Các API đã đồng bộ

### 1. Gửi tin nhắn
```http
POST /v1/chatbot/send-message
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "message": "Áo sơ mi trắng size L còn hàng không?",
  "conversationId": "507f1f77bcf86cd799439011" // optional
}
```

**Response:**
```json
{
  "conversationId": "507f1f77bcf86cd799439011",
  "response": "✅ Áo sơ mi trắng size L còn 5 cái trong kho. Giá: 250,000 VNĐ.",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "type": "inventory_check",
  "dataId": "507f1f77bcf86cd799439012"
}
```

### 2. Lấy lịch sử chat (mặc định)
```http
GET /v1/chatbot/conversations
Authorization: Bearer <jwt_token>
```

**Response:** Trả về mảng `ChatResponseDto[]` với câu trả lời cuối cùng của mỗi cuộc hội thoại.

### 3. Lấy lịch sử chat (toàn bộ)
```http
GET /v1/chatbot/conversations?type=full
Authorization: Bearer <jwt_token>
```

**Response:** Trả về mảng `ChatHistoryDto[]` với toàn bộ lịch sử chat.

### 4. Lấy chi tiết cuộc hội thoại
```http
GET /v1/chatbot/conversations/:id
Authorization: Bearer <jwt_token>
```

**Response:** Trả về `ChatResponseDto` với câu trả lời cuối cùng.

### 5. Lấy toàn bộ chi tiết cuộc hội thoại
```http
GET /v1/chatbot/conversations/:id/full
Authorization: Bearer <jwt_token>
```

**Response:** Trả về `ChatHistoryDto` với toàn bộ tin nhắn.

## Lợi ích của việc đồng bộ

1. **Tính nhất quán**: Tất cả API đều trả về cùng cấu trúc dữ liệu
2. **Dễ sử dụng**: Frontend chỉ cần xử lý một loại response format
3. **Type safety**: TypeScript có thể validate đúng kiểu dữ liệu
4. **Mobile app friendly**: Cấu trúc dữ liệu tối ưu cho mobile app

## Ví dụ sử dụng

### Frontend JavaScript/TypeScript
```typescript
// Gửi tin nhắn
const sendMessage = async (message: string, conversationId?: string) => {
  const response = await fetch('/v1/chatbot/send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message, conversationId })
  });
  
  const data: ChatResponseDto = await response.json();
  return data;
};

// Lấy lịch sử chat
const getChatHistory = async (type?: 'full') => {
  const url = type === 'full' 
    ? '/v1/chatbot/conversations?type=full'
    : '/v1/chatbot/conversations';
    
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return response.json();
};

// Xử lý response
const handleChatResponse = (data: ChatResponseDto) => {
  console.log('Conversation ID:', data.conversationId);
  console.log('Response:', data.response);
  console.log('Type:', data.type);
  console.log('Data ID:', data.dataId);
  
  if (data.type === 'inventory_check' && data.dataId) {
    // Xử lý inventory check
    handleInventoryCheck(data);
  }
};
```

### Mobile App (React Native)
```typescript
interface ChatResponse {
  conversationId: string;
  response: string;
  timestamp: Date;
  type?: string;
  dataId?: string;
}

const ChatScreen = () => {
  const [messages, setMessages] = useState<ChatResponse[]>([]);
  
  const sendMessage = async (text: string) => {
    try {
      const response = await api.post('/chatbot/send-message', {
        message: text
      });
      
      setMessages(prev => [...prev, response.data]);
      
      // Nếu là inventory check, hiển thị thông tin sản phẩm
      if (response.data.type === 'inventory_check' && response.data.dataId) {
        showProductInfo(response.data.dataId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  return (
    <View>
      {messages.map((msg, index) => (
        <ChatBubble 
          key={index}
          message={msg.response}
          timestamp={msg.timestamp}
          type={msg.type}
          dataId={msg.dataId}
        />
      ))}
    </View>
  );
};
```

## Lưu ý

1. **Type và DataId**: Chỉ có giá trị khi là inventory check
2. **Timestamp**: Luôn là thời gian gửi tin nhắn
3. **ConversationId**: Luôn có giá trị để tracking
4. **Response**: Luôn là nội dung câu trả lời từ chatbot

## Migration Guide

Nếu bạn đang sử dụng API cũ, cần cập nhật:

1. **Thay đổi response type**: Từ `ChatHistoryDto` sang `ChatResponseDto`
2. **Cập nhật field mapping**: 
   - `_id` → `conversationId`
   - `messages[last].content` → `response`
   - `messages[last].timestamp` → `timestamp`
3. **Thêm xử lý type và dataId**: Cho inventory check features 