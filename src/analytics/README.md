# Tài liệu API Thống Kê (Analytics)

**Lưu ý:**  
- Tất cả các API này đều bắt đầu bằng `/analytics`
- Chỉ tài khoản admin mới gọi được các API này (cần đăng nhập và có token)
- Gửi yêu cầu dạng GET

---

## 1. Thống kê tổng quan đơn hàng

**Đường dẫn:**  
`GET /analytics/overview`

**Ý nghĩa:**  
Cho biết tổng số đơn hàng, số đơn thành công, số đơn bị hủy, tổng sản phẩm đã bán, tổng doanh thu, tỷ lệ thành công.

**Lưu ý về logic tính toán:**
- Đơn hàng thành công bao gồm: đơn có trạng thái `delivered` hoặc `return`
- Doanh thu được tính từ tất cả đơn hàng thành công, sau đó trừ đi số tiền hoàn trả từ các đơn hoàn tiền đã hoàn thành
- Đơn hoàn trả loại "đổi hàng" không bị trừ khỏi doanh thu
- Chỉ đơn hoàn trả loại "hoàn tiền" và đã hoàn thành mới bị trừ khỏi doanh thu
- **Thời gian trừ đơn hoàn tiền:** Dựa trên thời gian hoàn thành đơn hoàn trả (`processedAt` hoặc `updatedAt`), không phải thời gian tạo đơn hàng gốc
- **Số tiền trừ:** Chỉ trừ `totalRefundAmount` từ đơn hoàn tiền, không trừ toàn bộ đơn hàng

**Tham số (truyền trên URL, có thể bỏ qua):**
- `startDate`: Ngày bắt đầu lọc (dạng YYYY-MM-DD), ví dụ: `2024-01-01`
- `endDate`: Ngày kết thúc lọc (dạng YYYY-MM-DD), ví dụ: `2024-12-31`

**Ví dụ gọi:**  
`/analytics/overview?startDate=2024-01-01&endDate=2024-06-30`

**Dữ liệu trả về mẫu:**
```json
{
  "totalOrders": 1250,
  "successfulOrders": 980,
  "cancelledOrders": 270,
  "totalProductsSold": 3450,
  "totalRevenue": 125000000,
  "successRate": 78.4
}
```
---

## 2. Thống kê doanh thu theo thời gian

**Đường dẫn:**  
`GET /analytics/revenue-by-time`

**Ý nghĩa:**  
Cho biết doanh thu và số đơn hàng theo từng ngày, tháng hoặc năm.

**Tham số (truyền trên URL, có thể bỏ qua):**
- `startDate`: Ngày bắt đầu (YYYY-MM-DD)
- `endDate`: Ngày kết thúc (YYYY-MM-DD)
- `timeType`: Kiểu thời gian nhóm dữ liệu (`day`, `month`, `year`). Mặc định là `month`.

**Ví dụ gọi:**  
`/analytics/revenue-by-time?startDate=2024-01-01&endDate=2024-06-30&timeType=month`

**Dữ liệu trả về mẫu:**
```json
[
  {
    "period": "2024-01",
    "revenue": 12500000,
    "orderCount": 125
  },
  {
    "period": "2024-02",
    "revenue": 15000000,
    "orderCount": 140
  }
]
```
---

## 3. Top sản phẩm bán chạy

**Đường dẫn:**  
`GET /analytics/top-products`

**Ý nghĩa:**  
Lấy ra các sản phẩm bán chạy nhất (theo doanh thu).

**Tham số (truyền trên URL, có thể bỏ qua):**
- `limit`: Số sản phẩm muốn lấy (mặc định là 3)

**Ví dụ gọi:**  
`/analytics/top-products?limit=5`

**Dữ liệu trả về mẫu:**
```json
[
  {
    "productId": "507f1f77bcf86cd799439011",
    "productName": "Áo thun nam cổ tròn",
    "image": "https://example.com/image.jpg",
    "soldQuantity": 150,
    "revenue": 7500000,
    "category": "Áo"
  }
]
```
---

## 4. Doanh thu theo danh mục sản phẩm

**Đường dẫn:**  
`GET /analytics/revenue-by-category`

**Ý nghĩa:**  
Cho biết doanh thu, số sản phẩm bán ra, phần trăm doanh thu của từng loại sản phẩm (ví dụ: Áo, Quần, Giày...).

**Ví dụ gọi:**  
`/analytics/revenue-by-category`

**Dữ liệu trả về mẫu:**
```json
[
  {
    "categoryName": "Áo",
    "revenue": 45000000,
    "productsSold": 890,
    "percentage": 36.5
  }
]
```
---

## 5. Sản phẩm tồn kho thấp

**Đường dẫn:**  
`GET /analytics/low-stock-products`

**Ý nghĩa:**  
Lấy danh sách sản phẩm sắp hết hàng (tồn kho dưới ngưỡng cảnh báo).

**Tham số (truyền trên URL, có thể bỏ qua):**
- `threshold`: Ngưỡng cảnh báo tồn kho (mặc định là 10)

**Ví dụ gọi:**  
`/analytics/low-stock-products?threshold=5`

**Dữ liệu trả về mẫu:**
```json
[
  {
    "productId": "507f1f77bcf86cd799439011",
    "productName": "Áo sơ mi trắng",
    "stock": 3
  }
]
```
---

## 6. Top khách hàng tiêu biểu

**Đường dẫn:**  
`GET /analytics/top-customers`

**Ý nghĩa:**  
Lấy danh sách khách hàng có số đơn hàng nhiều nhất và chi tiêu cao nhất.

**Tham số (truyền trên URL, có thể bỏ qua):**
- `limit`: Số khách hàng muốn lấy (mặc định là 10)

**Ví dụ gọi:**  
`/analytics/top-customers?limit=5`

**Dữ liệu trả về mẫu:**
```json
[
  {
    "customerId": "507f1f77bcf86cd799439011",
    "customerName": "Nguyễn Văn A",
    "orderCount": 20,
    "totalSpent": 15000000
  }
]
```
---

## 7. Thống kê phương thức thanh toán

**Đường dẫn:**  
`GET /analytics/payment-methods`

**Ý nghĩa:**  
Cho biết số lượng đơn hàng, doanh thu, phần trăm đơn hàng theo từng hình thức thanh toán (ví dụ: Tiền mặt, Chuyển khoản).

**Ví dụ gọi:**  
`/analytics/payment-methods`

**Dữ liệu trả về mẫu:**
```json
[
  {
    "paymentMethod": "COD",
    "orderCount": 750,
    "revenue": 45000000,
    "percentage": 60.5
  }
]
```
---

## 8. Thống kê sử dụng voucher

**Đường dẫn:**  
`GET /analytics/voucher-usage`

**Ý nghĩa:**  
Thống kê lượt sử dụng, tổng tiền đã giảm, doanh thu từ các đơn có sử dụng từng mã voucher.

**Ví dụ gọi:**  
`/analytics/voucher-usage`

**Dữ liệu trả về mẫu:**
```json
[
  {
    "voucherId": "507f1f77bcf86cd799439011",
    "type": "item",
    "discount": 10,
    "usageCount": 125,
    "totalDiscountAmount": 2500000,
    "revenueFromVoucherOrders": 15000000
  }
]
```
---

## **Tóm tắt dễ hiểu**

- **Muốn biết gì về bán hàng, doanh thu, sản phẩm, khách hàng, voucher... đều có API riêng.**
- **Chỉ cần gọi đúng đường dẫn, thêm tham số nếu muốn lọc, sẽ nhận được dữ liệu chi tiết.**
- **Tất cả API đều trả về dữ liệu dạng bảng hoặc danh sách, rất dễ đọc và xử lý.**

## **Logic tính toán doanh thu mới (Cập nhật)**

**Cách tính doanh thu thực tế:**
1. **Lấy tất cả đơn hàng thành công:** Bao gồm đơn có trạng thái `delivered` hoặc `return`
2. **Trừ đi số tiền hoàn trả:** Chỉ trừ `totalRefundAmount` từ các đơn hoàn trả có `returnType: 'refund'` và `status: 'completed'`
3. **Không trừ đơn đổi hàng:** Đơn hoàn trả có `returnType: 'exchange'` không bị trừ khỏi doanh thu
4. **Thời gian trừ đơn hoàn tiền:** Dựa trên thời gian hoàn thành đơn hoàn trả, không phải thời gian tạo đơn hàng gốc

**Ví dụ:**
- Đơn hàng A: 1,000,000 VNĐ (delivered, tạo ngày 01/01) → Tính vào doanh thu tháng 1
- Đơn hàng B: 500,000 VNĐ (return, tạo ngày 15/01) → Tính vào doanh thu tháng 1  
- Đơn hoàn tiền C: 300,000 VNĐ (refund, hoàn thành ngày 20/02) → Trừ 300,000 VNĐ khỏi doanh thu tháng 2
- Đơn đổi hàng D: 200,000 VNĐ (exchange, hoàn thành ngày 25/02) → Không trừ

**Doanh thu tháng 1 = 1,000,000 + 500,000 = 1,500,000 VNĐ**
**Doanh thu tháng 2 = 0 - 300,000 = -300,000 VNĐ**

Nếu bạn cần ví dụ cụ thể hơn về cách gọi bằng code, hoặc muốn giải thích thêm về ý nghĩa từng trường dữ liệu, hãy hỏi nhé! 