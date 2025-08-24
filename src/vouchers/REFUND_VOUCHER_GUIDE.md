# Hướng dẫn sử dụng VoucherRefundService

## Tổng quan

`VoucherRefundService` là một service chuyên biệt để xử lý việc tạo voucher hoàn tiền thay vì hoàn tiền trực tiếp. Service này được thiết kế để tái sử dụng và có thể tích hợp vào nhiều module khác nhau.

## Tính năng chính

### 1. Tạo voucher hoàn tiền tự động
- Tự động tính toán giá trị voucher (tăng 10% so với số tiền hoàn)
- Tạo điều kiện sử dụng hợp lý (60% giá trị voucher)
- Thời hạn sử dụng mặc định 30 ngày
- Gửi thông báo cho user và admin

### 2. Quản lý voucher
- Lấy danh sách voucher của user
- Kiểm tra tính hợp lệ của voucher
- Sử dụng voucher (giảm stock)

### 3. Tích hợp với hệ thống thông báo
- Thông báo push cho user
- Thông báo cho admin
- Tracking chi tiết quá trình

## Cách sử dụng

### 1. Tích hợp vào module

```typescript
// Trong module
import { VouchersModule } from '@/vouchers/vouchers.module';

@Module({
  imports: [
    // ... other imports
    VouchersModule,
  ],
  // ...
})
export class YourModule {}
```

### 2. Inject service

```typescript
// Trong service
import { VoucherRefundService } from '@/vouchers/services/voucher-refund.service';

@Injectable()
export class YourService {
  constructor(
    private voucherRefundService: VoucherRefundService,
  ) {}
}
```

### 3. Tạo voucher hoàn tiền

```typescript
// Tạo voucher cho refund
const voucherResult = await this.voucherRefundService.createRefundVoucher({
  userId: 'user_id_here',
  refundAmount: 500000, // 500k VND
  orderId: 'order_id_here',
  returnOrderId: 'return_order_id_here',
  reason: 'Sản phẩm không đúng mô tả',
  voucherType: 'item', // hoặc 'ship'
  validDays: 30,
  description: 'Voucher hoàn tiền từ yêu cầu trả hàng',
});

console.log('Voucher created:', voucherResult.voucher._id);
console.log('Voucher value:', voucherResult.voucherValue); // 550k VND (tăng 10%)
```

### 4. Lấy voucher của user

```typescript
// Lấy tất cả voucher hợp lệ của user
const vouchers = await this.voucherRefundService.getUserRefundVouchers(userId);
```

### 5. Kiểm tra tính hợp lệ

```typescript
// Kiểm tra voucher có thể sử dụng cho đơn hàng
const validation = await this.voucherRefundService.validateVoucherForUser(
  voucherId,
  userId,
  orderAmount, // Giá trị đơn hàng
);

if (validation.isValid) {
  console.log('Voucher hợp lệ:', validation.voucher);
} else {
  console.log('Voucher không hợp lệ:', validation.message);
}
```

### 6. Sử dụng voucher

```typescript
// Đánh dấu voucher đã được sử dụng
await this.voucherRefundService.useVoucher(voucherId);
```

## API Endpoints

### Admin endpoints (cần quyền admin)

#### 1. Tạo voucher hoàn tiền
```http
POST /v1/voucher-refund/create
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439011",
  "refundAmount": 500000,
  "orderId": "507f1f77bcf86cd799439012",
  "returnOrderId": "507f1f77bcf86cd799439013",
  "reason": "Sản phẩm không đúng mô tả",
  "voucherType": "item",
  "validDays": 30,
  "description": "Voucher hoàn tiền từ yêu cầu trả hàng"
}
```

#### 2. Lấy voucher của user cụ thể
```http
GET /v1/voucher-refund/user/507f1f77bcf86cd799439011
Authorization: Bearer <admin_token>
```

### User endpoints

#### 1. Lấy voucher của mình
```http
GET /v1/voucher-refund/my-vouchers
Authorization: Bearer <user_token>
```

#### 2. Kiểm tra tính hợp lệ của voucher
```http
GET /v1/voucher-refund/validate/507f1f77bcf86cd799439014?orderAmount=500000
Authorization: Bearer <user_token>
```

#### 3. Sử dụng voucher
```http
POST /v1/voucher-refund/use/507f1f77bcf86cd799439014
Authorization: Bearer <user_token>
```

## Logic tính toán

### 1. Giá trị voucher
```typescript
// Tăng 10% so với số tiền hoàn để khuyến khích mua hàng
voucherValue = refundAmount * 1.1
```

### 2. Điều kiện sử dụng
```typescript
// Điều kiện bằng 60% giá trị voucher
condition = voucherValue * 0.6
```

### 3. Thời hạn sử dụng
```typescript
// Mặc định 30 ngày từ ngày tạo
endDate = now + (validDays * 24 * 60 * 60 * 1000)
```

## Tích hợp với Return Orders

Service này đã được tích hợp tự động vào `ReturnOrdersService`. Khi admin cập nhật trạng thái return order thành `completed` và `returnType` là `refund`, hệ thống sẽ tự động:

1. Tạo voucher hoàn tiền
2. Gửi thông báo cho user
3. Gửi thông báo cho admin
4. Log kết quả

## Lợi ích

### Cho doanh nghiệp:
- ✅ Giữ chân khách hàng
- ✅ Tăng doanh thu từ đơn hàng tiếp theo
- ✅ Kiểm soát dòng tiền tốt hơn
- ✅ Giảm chi phí giao dịch payment gateway

### Cho khách hàng:
- ✅ Nhận giá trị cao hơn (tăng 10%)
- ✅ Linh hoạt trong việc sử dụng
- ✅ Không bị trừ phí giao dịch
- ✅ Có thời gian cân nhắc mua hàng

## Lưu ý quan trọng

1. **Tính tái sử dụng**: Service có thể được sử dụng cho nhiều mục đích khác ngoài return orders
2. **Error handling**: Các lỗi khi tạo voucher không ảnh hưởng đến quá trình chính
3. **Validation**: Đầy đủ validation cho input và business logic
4. **Logging**: Chi tiết log để debug và tracking
5. **Notifications**: Tự động gửi thông báo cho user và admin

## Ví dụ sử dụng thực tế

### Trong Return Orders
```typescript
// Tự động được gọi khi hoàn thành refund
if (returnRequest.returnType === 'refund') {
  const voucherResult = await this.voucherRefundService.createRefundVoucher({
    userId: returnRequest.customerId.toString(),
    refundAmount: returnRequest.totalRefundAmount,
    orderId: returnRequest.orderId.toString(),
    returnOrderId: returnRequest._id.toString(),
    reason: returnRequest.reason,
  });
}
```

### Trong Customer Service
```typescript
// Tạo voucher bồi thường cho khách hàng
const voucherResult = await this.voucherRefundService.createRefundVoucher({
  userId: customerId,
  refundAmount: compensationAmount,
  reason: 'Bồi thường cho sự cố dịch vụ',
  validDays: 60, // Thời hạn dài hơn cho bồi thường
});
```

### Trong Marketing
```typescript
// Tạo voucher khuyến mãi đặc biệt
const voucherResult = await this.voucherRefundService.createRefundVoucher({
  userId: userId,
  refundAmount: 100000,
  reason: 'Khuyến mãi đặc biệt cho khách hàng VIP',
  voucherType: 'item',
  validDays: 90,
});
```
