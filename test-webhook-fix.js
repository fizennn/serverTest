const axios = require('axios');
const crypto = require('crypto');

// Cấu hình test
const WEBHOOK_URL = 'http://localhost:3001/stripe/webhook';
const WEBHOOK_SECRET = 'whsec_IRJGcDEDQa4AISPF9VriUgtcDmPakyJ9'; // Secret thực tế từ Stripe Dashboard

// Tạo payload giả lập từ Stripe
const mockEvent = {
  id: 'evt_test_webhook',
  object: 'event',
  api_version: '2025-07-30.basil',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'pi_test_payment_intent',
      object: 'payment_intent',
      amount: 408000,
      currency: 'vnd',
      status: 'succeeded',
      metadata: {
        orderId: '688cbf2ea0dfe0327303e1a7'
      }
    }
  },
  type: 'payment_intent.succeeded',
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: 'req_test_request',
    idempotency_key: 'test-idempotency-key'
  }
};

// Tạo signature giả lập
function createSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = timestamp + '.' + payload;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  
  return `t=${timestamp},v1=${signature}`;
}

async function testWebhook() {
  console.log('🧪 Testing Webhook Configuration...\n');
  
  try {
    // 1. Test webhook-test endpoint trước
    console.log('1️⃣ Testing webhook configuration endpoint...');
    const configResponse = await axios.get('http://localhost:3001/stripe/webhook-test');
    console.log('✅ Config test response:', configResponse.data);
    console.log('');
    
    // 2. Test webhook endpoint với payload thật
    console.log('2️⃣ Testing webhook endpoint with mock Stripe event...');
    const payload = JSON.stringify(mockEvent);
    const signature = createSignature(payload, WEBHOOK_SECRET);
    
    console.log(`📤 Sending POST to: ${WEBHOOK_URL}`);
    console.log(`📝 Payload size: ${payload.length} bytes`);
    console.log(`🔐 Signature: ${signature.substring(0, 50)}...`);
    console.log('');
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
        'User-Agent': 'Stripe/v1 webhookbot'
      }
    });
    
    console.log('✅ Webhook test successful!');
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, response.data);
    
  } catch (error) {
    console.error('❌ Webhook test failed!');
    
    if (error.response) {
      console.error(`📊 Status: ${error.response.status}`);
      console.error(`📄 Response:`, error.response.data);
      console.error(`🔍 Headers:`, error.response.headers);
    } else if (error.request) {
      console.error('📡 No response received:', error.message);
      console.error('💡 Make sure server is running on port 3001');
    } else {
      console.error('⚠️ Error:', error.message);
    }
  }
}

// Chạy test
if (require.main === module) {
  console.log('🚀 Starting Stripe Webhook Test\n');
  console.log('⚠️  Make sure to:');
  console.log('   1. Server is running (npm run start:dev)');
  console.log('   2. Update STRIPE_WEBHOOK_SECRET in .env');
  console.log('   3. Update WEBHOOK_SECRET constant in this file');
  console.log('');
  
  testWebhook();
}

module.exports = { testWebhook, createSignature };
