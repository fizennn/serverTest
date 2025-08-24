# Cải tiến API Return Orders

## Tổng quan
API return-orders đã được cải tiến với các tính năng phân trang đầy đủ và lọc theo `returnType`.

## Các tính năng mới

### 1. Phân trang đầy đủ
Response hiện tại bao gồm:
- `data`: Danh sách return orders
- `total`: Tổng số return orders
- `pages`: Tổng số trang
- `currentPage`: Trang hiện tại
- `limit`: Số lượng item trên mỗi trang
- `hasNextPage`: Có trang tiếp theo không
- `hasPrevPage`: Có trang trước đó không

### 2. Lọc theo returnType
Thêm query parameter `returnType` để lọc:
- `refund`: Chỉ lấy các yêu cầu hoàn tiền
- `exchange`: Chỉ lấy các yêu cầu đổi hàng

### 3. Validation cải tiến
- Kiểm tra `page` phải >= 1
- Kiểm tra `limit` phải từ 1-100
- Thông báo lỗi rõ ràng cho các tham số không hợp lệ

## API Endpoints

### Admin Endpoints

#### GET /v1/return-orders
Lấy tất cả return orders với phân trang và lọc

**Query Parameters:**
- `page` (optional): Trang hiện tại (default: 1)
- `limit` (optional): Số lượng item trên trang (default: 10, max: 100)
- `status` (optional): Lọc theo trạng thái
- `returnType` (optional): Lọc theo loại trả hàng

**Example:**
```bash
GET /v1/return-orders?page=1&limit=10&status=pending&returnType=refund
```

**Response:**
```json
{
  "data": [...],
  "total": 50,
  "pages": 5,
  "currentPage": 1,
  "limit": 10,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

### User Endpoints

#### GET /v1/return-orders/my-returns
Lấy return orders của khách hàng hiện tại

**Query Parameters:**
- `page` (optional): Trang hiện tại (default: 1)
- `limit` (optional): Số lượng item trên trang (default: 10, max: 100)
- `returnType` (optional): Lọc theo loại trả hàng

**Example:**
```bash
GET /v1/return-orders/my-returns?page=1&limit=10&returnType=exchange
```

## Các trường hợp sử dụng

### 1. Lấy tất cả return orders (Admin)
```bash
GET /v1/return-orders?page=1&limit=10
```

### 2. Lọc theo status
```bash
GET /v1/return-orders?page=1&limit=10&status=pending
```

### 3. Lọc theo returnType
```bash
GET /v1/return-orders?page=1&limit=10&returnType=refund
```

### 4. Lọc kết hợp
```bash
GET /v1/return-orders?page=1&limit=10&status=approved&returnType=exchange
```

### 5. Phân trang
```bash
GET /v1/return-orders?page=2&limit=5
```

## Error Handling

### Validation Errors
- `Số trang không hợp lệ`: Khi page < 1
- `Số lượng item trên trang không hợp lệ`: Khi limit < 1 hoặc > 100

### Authentication Errors
- Cần JWT token hợp lệ cho user endpoints
- Cần admin token cho admin endpoints

## Testing

Sử dụng file `test-return-orders-api.http` để test các tính năng mới:

```bash
# Test phân trang cơ bản
GET http://localhost:3001/v1/return-orders?page=1&limit=10

# Test lọc theo returnType
GET http://localhost:3001/v1/return-orders?page=1&limit=10&returnType=refund

# Test validation
GET http://localhost:3001/v1/return-orders?page=0&limit=10
```
