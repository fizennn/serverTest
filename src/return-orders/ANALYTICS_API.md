# Return Order Analytics API

## Tổng quan

API này cung cấp các thống kê chi tiết về yêu cầu trả hàng trong hệ thống thương mại điện tử. Tất cả các endpoint đều yêu cầu quyền admin.

## Base URL
```
http://localhost:3001/v1/return-orders/analytics
```

## Các Endpoint

### 1. Dashboard Statistics
**GET** `/dashboard`

Lấy thống kê tổng quan cho trang chủ admin về trả hàng.

**Response:**
```json
{
  "todayReturns": 5,
  "yesterdayReturns": 8,
  "thisMonthReturns": 120,
  "lastMonthReturns": 95,
  "todayRefundAmount": 500000,
  "yesterdayRefundAmount": 800000,
  "thisMonthRefundAmount": 15000000,
  "lastMonthRefundAmount": 12000000,
  "approvalRate": 85.5,
  "todayStatusStats": {
    "pending": 2,
    "approved": 3,
    "rejected": 0,
    "processing": 1,
    "completed": 2
  }
}
```

### 2. Return Order Overview
**GET** `/overview?startDate=2024-01-01&endDate=2024-12-31`

Lấy thống kê tổng quan về yêu cầu trả hàng trong khoảng thời gian được chọn.

**Query Parameters:**
- `startDate` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `endDate` (optional): Ngày kết thúc (YYYY-MM-DD)

**Response:**
```json
{
  "totalReturnRequests": 150,
  "approvedReturns": 120,
  "rejectedReturns": 20,
  "processingReturns": 10,
  "completedReturns": 100,
  "totalProductsReturned": 250,
  "totalRefundAmount": 15000000,
  "approvalRate": 80.0,
  "returnStatusStats": {
    "pending": 50,
    "approved": 120,
    "rejected": 20,
    "processing": 10,
    "completed": 100
  }
}
```

### 3. Top Return Reasons
**GET** `/top-reasons?limit=5&startDate=2024-01-01&endDate=2024-12-31`

Lấy danh sách lý do trả hàng phổ biến nhất.

**Query Parameters:**
- `limit` (optional): Số lượng lý do top (mặc định 5)
- `startDate` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `endDate` (optional): Ngày kết thúc (YYYY-MM-DD)

**Response:**
```json
[
  {
    "reason": "Sản phẩm bị lỗi",
    "count": 45,
    "percentage": 30.0
  },
  {
    "reason": "Không vừa size",
    "count": 30,
    "percentage": 20.0
  }
]
```

### 4. Return by Category
**GET** `/return-by-category?startDate=2024-01-01&endDate=2024-12-31`

Thống kê trả hàng theo danh mục sản phẩm.

**Query Parameters:**
- `startDate` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `endDate` (optional): Ngày kết thúc (YYYY-MM-DD)

**Response:**
```json
[
  {
    "categoryName": "Áo",
    "productsReturned": 80,
    "refundAmount": 5000000,
    "returnRate": 15.5
  },
  {
    "categoryName": "Quần",
    "productsReturned": 60,
    "refundAmount": 4000000,
    "returnRate": 12.0
  }
]
```

### 5. Top Return Customers
**GET** `/top-return-customers?limit=10&startDate=2024-01-01&endDate=2024-12-31`

Danh sách khách hàng có nhiều yêu cầu trả hàng nhất.

**Query Parameters:**
- `limit` (optional): Số lượng khách hàng top (mặc định 10)
- `startDate` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `endDate` (optional): Ngày kết thúc (YYYY-MM-DD)

**Response:**
```json
[
  {
    "customerId": "507f1f77bcf86cd799439011",
    "customerName": "Nguyễn Văn A",
    "email": "nguyenvana@example.com",
    "returnCount": 5,
    "totalRefundAmount": 2000000
  }
]
```

### 6. Return by Time
**GET** `/return-by-time?startDate=2024-01-01&endDate=2024-12-31&timeType=month`

Thống kê trả hàng theo thời gian.

**Query Parameters:**
- `startDate` (optional): Ngày bắt đầu (YYYY-MM-DD)
- `endDate` (optional): Ngày kết thúc (YYYY-MM-DD)
- `timeType` (optional): Kiểu thời gian (day, month, year) - mặc định month

**Response:**
```json
[
  {
    "timePeriod": "2024-01",
    "returnCount": 25,
    "refundAmount": 3000000,
    "productsReturned": 40
  },
  {
    "timePeriod": "2024-02",
    "returnCount": 30,
    "refundAmount": 3500000,
    "productsReturned": 45
  }
]
```

## Authentication

Tất cả các endpoint đều yêu cầu:
- JWT token trong header: `Authorization: Bearer <token>`
- Quyền admin (AdminGuard)

## Error Responses

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Chỉ admin mới có quyền truy cập"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

## Ví dụ sử dụng

### Lấy thống kê tổng quan tháng này
```bash
curl -X GET "http://localhost:3001/v1/return-orders/analytics/overview?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Lấy top 5 lý do trả hàng
```bash
curl -X GET "http://localhost:3001/v1/return-orders/analytics/top-reasons?limit=5" \
  -H "Authorization: Bearer <your-jwt-token>"
```

### Lấy thống kê theo danh mục
```bash
curl -X GET "http://localhost:3001/v1/return-orders/analytics/return-by-category" \
  -H "Authorization: Bearer <your-jwt-token>"
```
