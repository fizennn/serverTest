# Logic Tính Doanh Thu - Xử Lý Đơn Return

## Tổng quan

Hệ thống thống kê doanh thu đã được cập nhật để xử lý chính xác các trường hợp đơn hàng return, phân biệt giữa **hoàn tiền** và **đổi hàng**.

## Logic Xử Lý Đơn Return

### 1. Phân loại đơn return

#### **A. Return Type = 'refund' (Hoàn tiền)**
- **Không tính vào doanh thu**
- Khách hàng được hoàn tiền toàn bộ hoặc một phần
- Đơn hàng bị loại trừ khỏi tất cả thống kê doanh thu

#### **B. Return Type = 'exchange' (Đổi hàng)**
- **Vẫn tính vào doanh thu**
- Khách hàng đổi sản phẩm khác, không hoàn tiền
- Đơn hàng vẫn được tính trong thống kê doanh thu

#### **C. Không có returnType**
- **Mặc định là đổi hàng** → Vẫn tính vào doanh thu
- Đảm bảo tương thích với dữ liệu cũ

### 2. Điều kiện áp dụng

Chỉ áp dụng logic này cho các đơn return có:
- `returnType = 'refund'` 
- `status = 'completed'` (đã hoàn thành xử lý)

### 3. Các phương thức thống kê được cập nhật

#### **A. getOrderOverview()**
```typescript
// Loại trừ đơn hàng có returnType = 'refund'
totalRevenue: {
  $sum: {
    $cond: [
      { 
        $and: [
          { $eq: ['$status', 'delivered'] },
          { $not: { $in: ['$_id', refundOrderIds] } }
        ]
      }, 
      '$total', 
      0
    ],
  },
}
```

#### **B. getTopProducts()**
```typescript
const matchCondition = {
  ...this.buildDateFilter(dateRange),
  status: 'delivered',
  _id: { $nin: refundOrderIds } // Loại trừ đơn refund
};
```

#### **C. getRevenueByCategory()**
```typescript
const matchCondition = {
  ...this.buildDateFilter(dateRange),
  status: 'delivered',
  _id: { $nin: refundOrderIds } // Loại trừ đơn refund
};
```

#### **D. getTopCustomers()**
```typescript
const matchCondition = {
  ...this.buildDateFilter(dateRange),
  status: 'delivered',
  _id: { $nin: refundOrderIds } // Loại trừ đơn refund
};
```

#### **E. getPaymentMethodStats()**
```typescript
const matchCondition = {
  ...this.buildDateFilter(dateRange),
  status: 'delivered',
  _id: { $nin: refundOrderIds } // Loại trừ đơn refund
};
```

#### **F. getVoucherUsageStats()**
```typescript
const matchCondition = {
  ...this.buildDateFilter(dateRange),
  status: 'delivered',
  _id: { $nin: refundOrderIds }, // Loại trừ đơn refund
  'vouchers.0': { $exists: true },
};
```

#### **G. getRevenueByTime()**
```typescript
const matchCondition = {
  ...this.buildDateFilter(dateRange),
  status: 'delivered',
  _id: { $nin: refundOrderIds } // Loại trừ đơn refund
};
```

### 4. Các phương thức helper

#### **A. getRefundOrderIds()**
- Lấy danh sách order IDs có `returnType = 'refund'` và `status = 'completed'`
- Áp dụng bộ lọc thời gian nếu có

#### **B. getRefundOrderIdsForDate()**
- Lấy danh sách order IDs có `returnType = 'refund'` trong một ngày cụ thể
- Dùng cho thống kê dashboard theo ngày

#### **C. getRefundOrderIdsForMonth()**
- Lấy danh sách order IDs có `returnType = 'refund'` trong một tháng
- Dùng cho thống kê dashboard theo tháng

#### **D. getRefundOrderIdsForYear()**
- Lấy danh sách order IDs có `returnType = 'refund'` trong một năm
- Dùng cho thống kê doanh thu theo tháng trong năm

### 5. Ví dụ thực tế

#### **Trường hợp 1: Đơn hàng đổi sản phẩm**
```json
{
  "orderId": "123",
  "total": 500000,
  "status": "delivered",
  "returnType": "exchange", // Đổi hàng
  "returnStatus": "completed"
}
```
→ **Vẫn tính vào doanh thu**: 500,000 VNĐ

#### **Trường hợp 2: Đơn hàng hoàn tiền**
```json
{
  "orderId": "456", 
  "total": 300000,
  "status": "delivered",
  "returnType": "refund", // Hoàn tiền
  "returnStatus": "completed"
}
```
→ **Không tính vào doanh thu**: 0 VNĐ

#### **Trường hợp 3: Đơn hàng cũ (không có returnType)**
```json
{
  "orderId": "789",
  "total": 400000,
  "status": "delivered"
  // Không có returnType
}
```
→ **Vẫn tính vào doanh thu**: 400,000 VNĐ (mặc định là đổi hàng)

### 6. Tác động đến báo cáo

#### **A. Doanh thu tổng quan**
- Chỉ tính đơn hàng `delivered` không bị hoàn tiền
- Phản ánh chính xác doanh thu thực tế

#### **B. Top sản phẩm bán chạy**
- Loại trừ sản phẩm từ đơn hàng bị hoàn tiền
- Hiển thị sản phẩm thực sự bán được

#### **C. Thống kê khách hàng**
- Không tính đơn hàng bị hoàn tiền vào tổng chi tiêu
- Phản ánh chính xác giá trị khách hàng

### 7. Lưu ý quan trọng

1. **Chỉ áp dụng cho đơn return có `status = 'completed'`**
2. **Đơn return `pending`, `approved`, `processing` vẫn tính vào doanh thu**
3. **Đảm bảo tương thích với dữ liệu cũ không có `returnType`**
4. **Cần cập nhật logic khi có thay đổi về trạng thái return**

### 8. Kiểm tra và validation

Để đảm bảo logic hoạt động đúng, cần kiểm tra:

1. **Đơn hàng có returnType = 'refund' và status = 'completed'** → Không tính doanh thu
2. **Đơn hàng có returnType = 'exchange' và status = 'completed'** → Vẫn tính doanh thu  
3. **Đơn hàng không có returnType** → Vẫn tính doanh thu
4. **Đơn hàng có returnType = 'refund' nhưng status != 'completed'** → Vẫn tính doanh thu
