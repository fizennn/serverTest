# Hướng dẫn Debug Webhook Stripe

## Vấn đề hiện tại
Lỗi "No raw body found" hoặc "Invalid webhook signature" khi nhận webhook từ Stripe.

## Nguyên nhân có thể

### 1. Cấu hình STRIPE_WEBHOOK_SECRET
- Kiểm tra biến môi trường `STRIPE_WEBHOOK_SECRET` trong file `.env`
- Webhook secret phải bắt đầu bằng `whsec_`

### 2. Cấu hình Raw Body Middleware
- Đã sửa trong `main.ts` để sử dụng `type: '*/*'` thay vì `'application/json'`
- Middleware phải được đặt trước CORS

### 3. Test Webhook

#### Bước 1: Kiểm tra cấu hình
```bash
GET http://localhost:3001/stripe/webhook-test
```

#### Bước 2: Test với cURL
```bash
curl -X POST http://localhost:3001/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: sha256=fbfc5d23d0c3baf0407b379b346e60b79e25bf96957eb7b0ba23fa3a9adea529" \
  -d '{"id":"evt_test","type":"payment_intent.succeeded","data":{"object":{"id":"pi_test","amount":1000,"currency":"vnd","metadata":{"orderId":"order_123"}}}}'
```

#### Bước 3: Tạo signature test
```bash
node test-webhook.js
```

## Các bước khắc phục

### 1. Kiểm tra Environment Variables
```bash
# Trong file .env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

### 2. Kiểm tra Stripe Dashboard
- Vào Stripe Dashboard > Webhooks
- Kiểm tra endpoint URL: `https://your-domain.com/stripe/webhook`
- Copy webhook secret từ Stripe Dashboard

### 3. Test với Stripe CLI (nếu có)
```bash
stripe listen --forward-to localhost:3001/stripe/webhook
```

## Log Debug
Khi có lỗi, kiểm tra log để xem:
- `[WEBHOOK] Raw body length: X bytes`
- `[WEBHOOK] Content-Type: application/json`
- `[VERIFY] Endpoint secret length: X`
- `[VERIFY] Signature length: X`

## Lưu ý quan trọng
1. Webhook secret phải chính xác từ Stripe Dashboard
2. Raw body middleware phải được cấu hình đúng
3. Signature header phải có format: `sha256=...`
4. Content-Type phải là `application/json` 