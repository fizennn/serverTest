# Return Orders API

## Tạo yêu cầu trả hàng

### Endpoint
```
POST /return-orders/orders/:orderId/return
```

### Mô tả
Tạo yêu cầu trả hàng cho đơn hàng đã giao thành công. Mỗi item cần có `itemId` để xác định chính xác item nào trong order cần trả.

### Request Body
```json
{
  "reason": "Sản phẩm không đúng mô tả",
  "description": "Màu sắc khác với hình ảnh",
  "items": [
    {
      "productId": "507f1f77bcf86cd799439013",
      "itemId": "507f1f77bcf86cd799439014",
      "quantity": 1
    }
  ],
  "images": ["image1.jpg", "image2.jpg"]
}
```

### Các trường bắt buộc:
- `reason`: Lý do trả hàng
- `items`: Mảng các item muốn trả
  - `productId`: ID của sản phẩm
  - `itemId`: **ID của item trong order** (quan trọng!)
  - `quantity`: Số lượng trả

### Các trường tùy chọn:
- `description`: Mô tả chi tiết
- `images`: Mảng URL hình ảnh đính kèm

### Ví dụ cURL
```bash
curl -X POST "http://localhost:3001/v1/return-orders/orders/688eac0252e39a386f6624b2/return" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Sản phẩm không đúng mô tả",
    "description": "Màu sắc khác với hình ảnh",
    "items": [
      {
        "productId": "507f1f77bcf86cd799439013",
        "itemId": "507f1f77bcf86cd799439014",
        "quantity": 1
      }
    ]
  }'
```

### Response
```json
{
  "orderId": "688eac0252e39a386f6624b2",
  "customerId": "507f1f77bcf86cd799439015",
  "reason": "Sản phẩm không đúng mô tả",
  "description": "Màu sắc khác với hình ảnh",
  "items": [
    {
      "productId": "507f1f77bcf86cd799439013",
      "itemId": "507f1f77bcf86cd799439014",
      "quantity": 1,
      "unitPrice": 399000,
      "totalPrice": 399000,
      "variant": "Áo sơ mi nam tay dài trắng trơn - Trắng - S"
    }
  ],
  "totalRefundAmount": 399000,
  "status": "pending",
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

## Lưu ý quan trọng

### 1. Lấy itemId từ order
Trước khi tạo yêu cầu trả hàng, bạn cần lấy `itemId` từ order:

```bash
GET /orders/688eac0252e39a386f6624b2
```

Response sẽ có dạng:
```json
{
  "items": [
    {
      "_id": "507f1f77bcf86cd799439014",  // ← Đây là itemId
      "product": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Áo sơ mi nam"
      },
      "quantity": 1,
      "price": 399000,
      "status": "delivered"
    }
  ]
}
```

### 2. Tác động đến order
Khi tạo yêu cầu trả hàng:
- Order status: `delivered` → `return-pending`
- Item status: `delivered` → `return-pending`

### 3. Cập nhật trạng thái
Admin có thể cập nhật trạng thái return order:
- `pending` → `approved` → `processing` → `completed`
- `pending` → `rejected`

Tương ứng với:
- Item status: `return-pending` → `return-approved` → `return-processing` → `return-completed`
- Item status: `return-pending` → `return-rejected`

### 4. Khôi phục stock
Khi status = `completed`, hệ thống sẽ tự động khôi phục stock của sản phẩm. 