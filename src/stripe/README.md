# Stripe Payment Module

Module này cung cấp các API để tích hợp thanh toán Stripe vào ứng dụng, hỗ trợ thẻ tín dụng/ghi nợ.

## Cài đặt

1. Cài đặt thư viện Stripe:
```bash
npm install stripe
```

2. Thêm biến môi trường vào file `.env`:
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## API Endpoints

### 1. Tạo Payment Intent
**POST** `/stripe/create-payment-intent`

**Body:**
```json
{
  "amount": 50000,
  "currency": "vnd",
  "orderId": "507f1f77bcf86cd799439011",
  "paymentMethods": ["card"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx",
    "paymentMethods": ["card"]
  }
}
```

### 2. Kiểm tra trạng thái thanh toán
**GET** `/stripe/payment-status/:paymentIntentId`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "pi_xxx",
    "status": "succeeded",
    "amount": 50000,
    "currency": "vnd"
  }
}
```

### 3. Xác nhận thanh toán
**POST** `/stripe/confirm-payment`

**Body:**
```json
{
  "paymentIntentId": "pi_xxx"
}
```

### 4. Webhook Handler
**POST** `/stripe/webhook`

**Headers:**
```
stripe-signature: t=timestamp,v1=signature
```

**Body:** Raw JSON từ Stripe

**Response:**
```json
{
  "received": true
}
```

## Phương thức thanh toán được hỗ trợ

### Thẻ tín dụng/ghi nợ (Card)
- Visa, Mastercard, American Express
- Hỗ trợ 3D Secure
- Thanh toán quốc tế
- Hỗ trợ tất cả các loại tiền tệ

## Webhook Events

Module này xử lý các webhook events sau:

### payment_intent.succeeded
- Tự động cập nhật trạng thái thanh toán của đơn hàng thành `paid`
- Lấy `orderId` từ metadata của payment intent
- Gọi API `/orders/{orderId}/payment-status` để cập nhật

### payment_intent.payment_failed
- Log thông tin thanh toán thất bại
- Có thể mở rộng để xử lý thêm logic khác

## Lưu ý quan trọng

1. **Đơn vị tiền tệ**: Stripe tính bằng đơn vị nhỏ nhất:
   - USD: cent (1 USD = 100 cent)
   - VND: đồng (1 VND = 1 đồng)

2. **Bảo mật**: Luôn sử dụng biến môi trường cho khóa bí mật trong production

3. **Currency**: Hỗ trợ các loại tiền tệ như 'vnd', 'usd', 'eur'

4. **Webhook Security**: 
   - Luôn verify signature của webhook
   - Sử dụng endpoint secret từ Stripe Dashboard
   - Chỉ xử lý events từ Stripe

5. **Order Integration**:
   - Truyền `orderId` khi tạo payment intent
   - Webhook sẽ tự động cập nhật trạng thái thanh toán

## Sử dụng trong Frontend

```javascript
// Tạo payment intent với card
const response = await fetch('/stripe/create-payment-intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 50000, // 50,000 VND
    currency: 'vnd',
    orderId: '507f1f77bcf86cd799439011', // ID đơn hàng
    paymentMethods: ['card'] // Hỗ trợ thẻ tín dụng/ghi nợ
  })
});

const { clientSecret, paymentMethods } = await response.json();

// Sử dụng clientSecret với Stripe React Native
// Payment Sheet sẽ hiển thị form nhập thông tin thẻ
```

## Cấu hình trong Stripe Dashboard

1. Vào Stripe Dashboard > Settings > Payment methods
2. Đảm bảo Cards đã được kích hoạt
3. Cấu hình 3D Secure nếu cần
4. Test với thẻ test của Stripe

## Trạng thái Payment Intent

- `requires_payment_method`: Cần thêm phương thức thanh toán
- `requires_confirmation`: Cần xác nhận
- `requires_action`: Cần hành động bổ sung (3D Secure)
- `processing`: Đang xử lý
- `requires_capture`: Cần capture
- `canceled`: Đã hủy
- `succeeded`: Thành công 