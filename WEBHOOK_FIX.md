# Khắc phục lỗi "No raw body found" trong Webhook Stripe

## Vấn đề hiện tại
Webhook từ Stripe trả về lỗi 400 với message "No raw body found"

## Nguyên nhân
1. **Raw body middleware không hoạt động đúng**
2. **Cấu hình middleware không phù hợp với NestJS**
3. **Thiếu environment variables**

## Giải pháp

### Bước 1: Kiểm tra Environment Variables
Tạo file `.env` trong thư mục gốc:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
PORT=3001
```

### Bước 2: Cấu hình lại Middleware trong main.ts
Đã sửa middleware để xử lý raw body đúng cách:

```typescript
app.use('/stripe/webhook', (req, res, next) => {
  let data = '';
  req.setEncoding('utf8');
  
  req.on('data', (chunk) => {
    data += chunk;
  });
  
  req.on('end', () => {
    req.rawBody = Buffer.from(data, 'utf8');
    next();
  });
});
```

### Bước 3: Test Webhook Configuration
```bash
# Kiểm tra cấu hình
GET http://localhost:3001/stripe/webhook-test

# Test với dữ liệu thật
node test-real-webhook.js
```

### Bước 4: Cập nhật Stripe Dashboard
1. Vào Stripe Dashboard > Webhooks
2. Tạo webhook endpoint: `https://your-domain.com/stripe/webhook`
3. Copy webhook secret và cập nhật vào `.env`
4. Chọn events: `payment_intent.succeeded`, `payment_intent.payment_failed`

### Bước 5: Test với cURL
```bash
curl -X POST http://localhost:3001/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: sha256=your_signature" \
  -d '{"id":"evt_test","type":"payment_intent.succeeded","data":{"object":{"id":"pi_test","amount":10000,"currency":"vnd","metadata":{"orderId":"order_123"}}}}'
```

## Debug Steps

### 1. Kiểm tra logs
Khi có lỗi, kiểm tra log để xem:
- `[WEBHOOK] Raw body length: X bytes`
- `[WEBHOOK] Content-Type: application/json`
- `[WEBHOOK] User-Agent: Stripe/v1`
- `[VERIFY] Endpoint secret length: X`

### 2. Test với Stripe CLI (nếu có)
```bash
stripe listen --forward-to localhost:3001/stripe/webhook
```

### 3. Kiểm tra Network
- Đảm bảo server có thể nhận request từ Stripe
- Kiểm tra firewall và CORS settings

## Lưu ý quan trọng

1. **Webhook secret phải chính xác** từ Stripe Dashboard
2. **Raw body middleware phải được đặt trước CORS**
3. **Signature header phải có format**: `sha256=...`
4. **Content-Type phải là**: `application/json`
5. **Server phải trả về 200 OK** trong vòng 10 giây

## Troubleshooting

### Nếu vẫn lỗi "No raw body found":
1. Kiểm tra middleware có được load đúng không
2. Thử restart server
3. Kiểm tra logs để xem middleware có được gọi không

### Nếu lỗi "Invalid webhook signature":
1. Kiểm tra webhook secret có đúng không
2. Đảm bảo signature header có format đúng
3. Kiểm tra raw body có được parse đúng không

### Nếu webhook không được gọi:
1. Kiểm tra endpoint URL trong Stripe Dashboard
2. Đảm bảo server đang chạy và accessible
3. Kiểm tra network connectivity 