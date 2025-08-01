# Stripe Payment Module

Module này cung cấp các API để tích hợp thanh toán Stripe vào ứng dụng.

## Cài đặt

1. Cài đặt thư viện Stripe:
```bash
npm install stripe
```

2. Thêm biến môi trường vào file `.env`:
```env
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
```

## API Endpoints

### 1. Tạo Payment Intent
**POST** `/stripe/create-payment-intent`

**Body:**
```json
{
  "amount": 50000,
  "currency": "vnd"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentIntentId": "pi_xxx"
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

## Lưu ý quan trọng

1. **Đơn vị tiền tệ**: Stripe tính bằng đơn vị nhỏ nhất:
   - USD: cent (1 USD = 100 cent)
   - VND: đồng (1 VND = 1 đồng)

2. **Bảo mật**: Luôn sử dụng biến môi trường cho khóa bí mật trong production

3. **Currency**: Hỗ trợ các loại tiền tệ như 'vnd', 'usd', 'eur'

## Sử dụng trong Frontend

```javascript
// Tạo payment intent
const response = await fetch('/stripe/create-payment-intent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: 50000, // 50,000 VND
    currency: 'vnd'
  })
});

const { clientSecret } = await response.json();

// Sử dụng clientSecret với Stripe React Native
```

## Trạng thái Payment Intent

- `requires_payment_method`: Cần thêm phương thức thanh toán
- `requires_confirmation`: Cần xác nhận
- `requires_action`: Cần hành động bổ sung (3D Secure)
- `processing`: Đang xử lý
- `requires_capture`: Cần capture
- `canceled`: Đã hủy
- `succeeded`: Thành công 