# Hướng Dẫn Sử Dụng Swagger API - Hệ Thống Voucher

## Truy Cập Swagger UI

Sau khi khởi động server, truy cập Swagger UI tại:
```
http://localhost:3000/api
```

## Các Endpoint Chính

### 1. Voucher - Hệ thống giảm giá

#### Tạo Voucher Mới (Admin)
```http
POST /vouchers
```

**Body:**
```json
{
  "type": "item",
  "disCount": 10,
  "condition": 500000,
  "limit": 100000,
  "stock": 50,
  "start": "2024-01-01T00:00:00.000Z",
  "end": "2024-12-31T23:59:59.999Z",
  "userId": ["507f1f77bcf86cd799439011"]
}
```

**Giải thích:**
- `type`: `item` (giảm giá sản phẩm) hoặc `ship` (giảm giá vận chuyển)
- `disCount`: Phần trăm giảm giá (%)
- `condition`: Điều kiện tối thiểu (VNĐ)
- `limit`: Giới hạn giảm giá tối đa (VNĐ)
- `stock`: Số lượng voucher có sẵn
- `start/end`: Thời gian hiệu lực
- `userId`: Danh sách user được phép sử dụng

#### Lấy Danh Sách Voucher
```http
GET /vouchers?page=1&limit=10
```

#### Lấy Voucher Đang Hoạt Động
```http
GET /vouchers/active
```

#### Kiểm Tra Voucher Đơn Lẻ
```http
POST /vouchers/{id}/check
```

**Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "subtotal": 1000000,
  "shipCost": 30000
}
```

**Response:**
```json
{
  "valid": true,
  "itemDiscount": 50000,
  "shipDiscount": 0,
  "voucher": {
    "_id": "507f1f77bcf86cd799439011",
    "type": "item",
    "disCount": 10,
    "condition": 500000,
    "limit": 100000
  }
}
```

#### Tính Toán Nhiều Voucher
```http
POST /vouchers/calculate-discounts
```

**Body:**
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "subtotal": 1000000,
  "shipCost": 30000,
  "voucherIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
}
```

**Response:**
```json
{
  "totalItemDiscount": 80000,
  "totalShipDiscount": 15000,
  "validVouchers": [
    {
      "voucherId": "507f1f77bcf86cd799439011",
      "itemDiscount": 50000,
      "shipDiscount": 0
    }
  ],
  "errors": [
    {
      "voucherId": "507f1f77bcf86cd799439012",
      "message": "Voucher is out of stock"
    }
  ],
  "finalTotal": 935000
}
```

### 2. Đơn Hàng

#### Tạo Đơn Hàng Mới
```http
POST /orders
```

**Body:**
```json
{
  "items": [
    {
      "sizeId": "507f1f77bcf86cd799439011",
      "quantity": 2
    }
  ],
  "address": "68551835dc75515b71ad59c6",
  "vouchers": ["68565473537f64f28418e85c"],
  "storeAddress": "123 Đường ABC, Quận 1, TP.HCM",
  "shipCost": 30000,
  "note": "Giao hàng vào buổi chiều"
}
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "idUser": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Nguyễn Văn A",
    "email": "user@example.com"
  },
  "items": [
    {
      "product": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "Áo thun nam",
        "images": ["image1.jpg"],
        "price": 500000
      },
      "quantity": 2,
      "price": 500000,
      "variant": "Áo thun nam - Đỏ - M"
    }
  ],
  "address": {
    "phone": "0123456789",
    "address": "123 Đường ABC, Quận 1, TP.HCM"
  },
  "vouchers": [
    {
      "_id": "68565473537f64f28418e85c",
      "type": "item",
      "disCount": 10,
      "condition": 500000,
      "limit": 100000
    }
  ],
  "subtotal": 1000000,
  "itemDiscount": 50000,
  "shipDiscount": 0,
  "total": 950000,
  "shipCost": 30000,
  "status": "pending"
}
```

## Ví Dụ Sử Dụng

### Ví dụ 1: Tạo Item Voucher
```json
{
  "type": "item",
  "disCount": 15,
  "condition": 800000,
  "limit": 150000,
  "stock": 100,
  "start": "2024-01-01T00:00:00.000Z",
  "end": "2024-12-31T23:59:59.999Z",
  "userId": ["507f1f77bcf86cd799439011"]
}
```

### Ví dụ 2: Tạo Ship Voucher
```json
{
  "type": "ship",
  "disCount": 50,
  "condition": 300000,
  "limit": 25000,
  "stock": 200,
  "start": "2024-01-01T00:00:00.000Z",
  "end": "2024-12-31T23:59:59.999Z",
  "userId": ["507f1f77bcf86cd799439011"]
}
```

### Ví dụ 3: Tạo Đơn Hàng Với Voucher
```json
{
  "items": [
    {
      "sizeId": "507f1f77bcf86cd799439011",
      "quantity": 3
    }
  ],
  "address": "68551835dc75515b71ad59c6",
  "vouchers": [
    "507f1f77bcf86cd799439011",  // Item voucher
    "507f1f77bcf86cd799439012"   // Ship voucher
  ],
  "storeAddress": "123 Đường ABC, Quận 1, TP.HCM",
  "shipCost": 50000,
  "note": "Giao hàng vào buổi sáng"
}
```

## Lưu Ý Quan Trọng

1. **Authentication**: Hầu hết endpoints yêu cầu JWT token
2. **Admin Rights**: Một số endpoints chỉ dành cho admin
3. **Validation**: Tất cả dữ liệu đầu vào đều được validate
4. **Error Handling**: Hệ thống trả về lỗi chi tiết
5. **Stock Management**: Voucher stock tự động giảm khi sử dụng

## Testing với Swagger

1. **Authorize**: Click "Authorize" và nhập JWT token
2. **Try it out**: Click "Try it out" để test endpoint
3. **Execute**: Click "Execute" để gửi request
4. **Response**: Xem kết quả và response schema

## Error Codes

- `400`: Dữ liệu không hợp lệ
- `401`: Chưa đăng nhập
- `403`: Không có quyền truy cập
- `404`: Không tìm thấy resource
- `500`: Lỗi server 