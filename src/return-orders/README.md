# Return Orders Module

Module quản lý yêu cầu trả hàng của khách hàng.

## API Endpoints

### 1. Tạo yêu cầu trả hàng
- **Endpoint**: `POST /return-orders/orders/:orderId/return`
- **Mô tả**: Khách hàng tạo yêu cầu trả hàng cho đơn hàng đã giao thành công
- **Authentication**: JWT token
- **Request Body**:
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
  "returnType": "exchange",
  "images": ["image1.jpg"],
  "videoUrl": "https://example.com/video.mp4"
}
```

### 2. Lấy tất cả yêu cầu trả hàng (Admin) - API cũ
- **Endpoint**: `GET /return-orders`
- **Mô tả**: Admin lấy tất cả yêu cầu trả hàng với phân trang và lọc cơ bản
- **Authentication**: Admin token
- **Query Parameters**:
  - `page` (optional): Số trang (mặc định: 1)
  - `limit` (optional): Số lượng item trên mỗi trang (mặc định: 10)
  - `status` (optional): Lọc theo trạng thái
  - `returnType` (optional): Lọc theo loại trả hàng

### 3. Tìm kiếm nâng cao yêu cầu trả hàng (Admin) - API mới
- **Endpoint**: `GET /return-orders/search`
- **Mô tả**: Admin tìm kiếm yêu cầu trả hàng với các bộ lọc nâng cao
- **Authentication**: Admin token
- **Query Parameters**:
  - `keyword` (optional): Từ khóa tìm kiếm (ID yêu cầu trả hàng, tên/email khách hàng, ID đơn hàng gốc)
  - `status` (optional): Lọc theo trạng thái: `pending`, `approved`, `rejected`, `processing`, `completed`
  - `returnType` (optional): Lọc theo loại trả hàng: `refund`, `exchange`
  - `startDate` (optional): Ngày bắt đầu (ISO string)
  - `endDate` (optional): Ngày kết thúc (ISO string)
  - `minRefundAmount` (optional): Số tiền hoàn trả tối thiểu
  - `maxRefundAmount` (optional): Số tiền hoàn trả tối đa
  - `sortBy` (optional): Trường sắp xếp: `createdAt`, `updatedAt`, `totalRefundAmount`, `status`, `customerName`
  - `sortOrder` (optional): Thứ tự sắp xếp: `asc`, `desc`
  - `page` (optional): Trang hiện tại (mặc định: 1)
  - `limit` (optional): Số lượng item trên mỗi trang (mặc định: 10, tối đa: 100)

#### Ví dụ sử dụng API tìm kiếm nâng cao:

```bash
# Tìm kiếm theo tên khách hàng
GET /return-orders/search?keyword=Nguyễn&page=1&limit=10

# Tìm kiếm theo ID yêu cầu trả hàng
GET /return-orders/search?keyword=68896ceb759ba2dbe04d791d

# Tìm kiếm theo trạng thái và loại trả hàng
GET /return-orders/search?status=pending&returnType=refund

# Tìm kiếm theo khoảng thời gian
GET /return-orders/search?startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z

# Tìm kiếm theo khoảng tiền hoàn trả
GET /return-orders/search?minRefundAmount=100000&maxRefundAmount=500000

# Sắp xếp theo tên khách hàng tăng dần
GET /return-orders/search?sortBy=customerName&sortOrder=asc

# Tìm kiếm kết hợp nhiều điều kiện
GET /return-orders/search?keyword=Nguyễn&status=pending&returnType=exchange&startDate=2024-01-01T00:00:00.000Z&minRefundAmount=100000&sortBy=createdAt&sortOrder=desc&page=1&limit=5
```

### 4. Lấy yêu cầu trả hàng theo orderId
- **Endpoint**: `GET /return-orders/orders/:orderId/return`
- **Mô tả**: Lấy thông tin yêu cầu trả hàng của đơn hàng
- **Authentication**: JWT token

### 5. Lấy yêu cầu trả hàng theo ID
- **Endpoint**: `GET /return-orders/get/:id`
- **Mô tả**: Lấy chi tiết yêu cầu trả hàng theo ID
- **Authentication**: JWT token

### 6. Lấy danh sách yêu cầu trả hàng của khách hàng
- **Endpoint**: `GET /return-orders/my-returns`
- **Mô tả**: Lấy tất cả yêu cầu trả hàng của khách hàng hiện tại
- **Authentication**: JWT token
- **Query Parameters**:
  - `page` (optional): Số trang
  - `limit` (optional): Số lượng item trên mỗi trang
  - `returnType` (optional): Lọc theo loại trả hàng

### 7. Cập nhật trạng thái yêu cầu trả hàng (Admin)
- **Endpoint**: `PUT /return-orders/:id/status`
- **Mô tả**: Admin cập nhật trạng thái yêu cầu trả hàng
- **Authentication**: Admin token
- **Request Body**:
```json
{
  "status": "approved",
  "adminNote": "Đã kiểm tra và chấp nhận yêu cầu trả hàng"
}
```

### 8. Xóa yêu cầu trả hàng (Admin)
- **Endpoint**: `DELETE /return-orders/:id`
- **Mô tả**: Admin xóa yêu cầu trả hàng
- **Authentication**: Admin token

### 9. Thống kê trả hàng (Admin)
- **Endpoint**: `GET /return-orders/statistics`
- **Mô tả**: Lấy thống kê về các yêu cầu trả hàng
- **Authentication**: Admin token
- **Query Parameters**:
  - `startDate` (optional): Ngày bắt đầu (YYYY-MM-DD)
  - `endDate` (optional): Ngày kết thúc (YYYY-MM-DD)

## Trạng thái yêu cầu trả hàng

- `pending`: Đang chờ xử lý
- `approved`: Đã được chấp nhận
- `rejected`: Đã bị từ chối
- `processing`: Đang xử lý
- `completed`: Đã hoàn thành

## Loại yêu cầu trả hàng

- `refund`: Hoàn tiền
- `exchange`: Đổi hàng

## Lưu ý quan trọng

1. **Thời hạn trả hàng**: Chỉ có thể trả hàng trong vòng 7 ngày sau khi giao hàng thành công
2. **Trạng thái đơn hàng**: Đơn hàng phải có trạng thái `delivered` hoặc bắt đầu bằng `return-`
3. **ItemId**: Cần lấy `itemId` từ đơn hàng gốc trước khi tạo yêu cầu trả hàng
4. **Tác động đến đơn hàng**: Khi tạo yêu cầu trả hàng, trạng thái đơn hàng sẽ được cập nhật thành `return`
5. **Tìm kiếm nâng cao**: API mới hỗ trợ tìm kiếm theo tên/email khách hàng, khoảng thời gian, khoảng tiền và sắp xếp linh hoạt 