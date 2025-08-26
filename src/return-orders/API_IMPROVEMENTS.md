# API Improvements - Return Orders Module

## Tổng quan

Đã thêm các tính năng tìm kiếm và sắp xếp nâng cao cho API quản lý đơn hoàn trả.

## Các tính năng mới

### 1. API Tìm kiếm nâng cao
- **Endpoint**: `GET /return-orders/search`
- **Mô tả**: Tìm kiếm đơn hoàn trả với nhiều bộ lọc nâng cao

### 2. Các tham số tìm kiếm mới

#### Tìm kiếm theo từ khóa
- `keyword`: Tìm kiếm theo:
  - ID yêu cầu trả hàng
  - Tên khách hàng
  - Email khách hàng
  - ID đơn hàng gốc
  - Lý do trả hàng
  - Mô tả chi tiết

#### Lọc theo thời gian
- `startDate`: Ngày bắt đầu (ISO string)
- `endDate`: Ngày kết thúc (ISO string)

#### Lọc theo số tiền
- `minRefundAmount`: Số tiền hoàn trả tối thiểu
- `maxRefundAmount`: Số tiền hoàn trả tối đa

#### Sắp xếp linh hoạt
- `sortBy`: Trường sắp xếp
  - `createdAt`: Thời gian tạo
  - `updatedAt`: Thời gian cập nhật
  - `totalRefundAmount`: Số tiền hoàn trả
  - `status`: Trạng thái
  - `customerName`: Tên khách hàng
- `sortOrder`: Thứ tự sắp xếp
  - `asc`: Tăng dần
  - `desc`: Giảm dần

### 3. Cải tiến kỹ thuật

#### Aggregation Pipeline
- Sử dụng MongoDB Aggregation để tìm kiếm theo tên/email khách hàng
- Lookup với collections: `users`, `orders`, `products`
- Hỗ trợ tìm kiếm text với regex pattern

#### Validation
- Validation đầy đủ cho tất cả query parameters
- Kiểm tra ObjectId format
- Giới hạn limit từ 1-100

#### Performance
- Tối ưu query với index
- Sử dụng Promise.all cho parallel queries
- Caching kết quả aggregation

## Cấu trúc code

### DTOs mới
```typescript
// src/return-orders/dtos/return-order.dto.ts
export enum ReturnOrderSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  TOTAL_REFUND_AMOUNT = 'totalRefundAmount',
  STATUS = 'status',
  CUSTOMER_NAME = 'customerName'
}

export enum ReturnOrderSortOrder {
  ASC = 'asc',
  DESC = 'desc'
}

export class AdvancedSearchReturnOrderDto {
  keyword?: string;
  status?: string;
  returnType?: string;
  startDate?: string;
  endDate?: string;
  minRefundAmount?: number;
  maxRefundAmount?: number;
  sortBy?: ReturnOrderSortField;
  sortOrder?: ReturnOrderSortOrder;
  page?: number;
  limit?: number;
}
```

### Service method mới
```typescript
// src/return-orders/services/return-orders.service.ts
async advancedSearchReturnOrders(searchDto: any): Promise<{
  data: ReturnOrderDocument[];
  total: number;
  pages: number;
}>
```

### Controller endpoint mới
```typescript
// src/return-orders/controllers/return-orders.controller.ts
@Get('search')
async searchReturnOrders(@Query() searchDto: AdvancedSearchReturnOrderDto)
```

## Ví dụ sử dụng

### Tìm kiếm cơ bản
```bash
GET /return-orders/search?keyword=Nguyễn&page=1&limit=10
```

### Tìm kiếm nâng cao
```bash
GET /return-orders/search?keyword=Nguyễn&status=pending&returnType=exchange&startDate=2024-01-01T00:00:00.000Z&minRefundAmount=100000&sortBy=createdAt&sortOrder=desc&page=1&limit=5
```

### Sắp xếp theo tên khách hàng
```bash
GET /return-orders/search?sortBy=customerName&sortOrder=asc
```

## Backward Compatibility

- API cũ `GET /return-orders` vẫn hoạt động bình thường
- Không ảnh hưởng đến các endpoint khác
- Có thể sử dụng song song cả hai API

## Testing

File test: `test-return-orders-search.http`
- Test tất cả các trường hợp tìm kiếm
- Test validation
- Test performance

## Documentation

- Cập nhật README.md với đầy đủ thông tin
- Swagger documentation tự động
- Ví dụ sử dụng chi tiết
