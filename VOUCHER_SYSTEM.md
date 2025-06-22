# Hệ Thống Voucher

## Tổng Quan

Hệ thống voucher được thiết kế để hỗ trợ 2 loại giảm giá chính:
- **Item Voucher**: Giảm giá cho sản phẩm
- **Ship Voucher**: Giảm giá cho phí vận chuyển

## Cấu Trúc Voucher

### Schema
```typescript
{
  type: 'item' | 'ship',        // Loại voucher
  disCount: number,             // Phần trăm giảm giá (%)
  condition: number,            // Điều kiện tối thiểu (VNĐ)
  limit: number,                // Giới hạn giảm giá tối đa (VNĐ)
  stock: number,                // Số lượng voucher có sẵn
  start: Date,                  // Ngày bắt đầu hiệu lực
  end: Date,                    // Ngày kết thúc hiệu lực
  userId: ObjectId[],           // Danh sách user được phép sử dụng
  isDisable: boolean            // Trạng thái vô hiệu hóa
}
```

## Cách Hoạt Động

### 1. Item Voucher
- **Điều kiện**: Tổng tiền sản phẩm >= `condition`
- **Tính toán**: `(subtotal * disCount / 100)` nhưng không vượt quá `limit`
- **Áp dụng**: Trừ trực tiếp vào tổng tiền sản phẩm

### 2. Ship Voucher
- **Điều kiện**: Tổng tiền sản phẩm >= `condition`
- **Tính toán**: `(shipCost * disCount / 100)` nhưng không vượt quá `limit`
- **Áp dụng**: Trừ trực tiếp vào phí vận chuyển

## API Endpoints

### 1. Kiểm tra voucher đơn lẻ
```http
POST /vouchers/:id/check
Content-Type: application/json

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
  "voucher": { ... }
}
```

### 2. Tính toán nhiều voucher
```http
POST /vouchers/calculate-discounts
Content-Type: application/json

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

## Ví Dụ Sử Dụng

### Ví dụ 1: Item Voucher
```json
{
  "type": "item",
  "disCount": 10,
  "condition": 500000,
  "limit": 100000,
  "stock": 50,
  "start": "2024-01-01T00:00:00.000Z",
  "end": "2024-12-31T23:59:59.999Z"
}
```

- Giảm 10% cho sản phẩm
- Điều kiện: Đơn hàng >= 500,000 VNĐ
- Giới hạn: Tối đa 100,000 VNĐ
- Nếu đơn hàng 1,000,000 VNĐ → Giảm 100,000 VNĐ (không vượt quá limit)

### Ví dụ 2: Ship Voucher
```json
{
  "type": "ship",
  "disCount": 50,
  "condition": 300000,
  "limit": 20000,
  "stock": 100,
  "start": "2024-01-01T00:00:00.000Z",
  "end": "2024-12-31T23:59:59.999Z"
}
```

- Giảm 50% cho phí vận chuyển
- Điều kiện: Đơn hàng >= 300,000 VNĐ
- Giới hạn: Tối đa 20,000 VNĐ
- Nếu phí ship 50,000 VNĐ → Giảm 20,000 VNĐ (không vượt quá limit)

## Tích Hợp Với Đơn Hàng

Khi tạo đơn hàng, hệ thống sẽ:
1. Kiểm tra tính hợp lệ của từng voucher
2. Tính toán discount theo type
3. Áp dụng limit cho từng loại
4. Cập nhật stock của voucher
5. Lưu thông tin discount vào order

### Order Schema Mới
```typescript
{
  // ... các trường khác
  subtotal: number,        // Tổng tiền sản phẩm trước giảm giá
  itemDiscount: number,    // Tổng giảm giá sản phẩm
  shipDiscount: number,    // Tổng giảm giá vận chuyển
  total: number,           // Tổng tiền cuối cùng
  vouchers: ObjectId[]     // Danh sách voucher đã sử dụng
}
```

## Lưu Ý

1. **Validation**: Mỗi voucher phải được kiểm tra:
   - Thời gian hiệu lực
   - Stock còn lại
   - Quyền sử dụng của user
   - Điều kiện tối thiểu

2. **Limit**: Mỗi voucher có limit riêng cho từng loại

3. **Stock Management**: Stock sẽ giảm khi voucher được sử dụng

4. **Error Handling**: Hệ thống trả về lỗi chi tiết cho từng voucher không hợp lệ 