const axios = require('axios');
const crypto = require('crypto');

// Cấu hình cho production
const WEBHOOK_URL = 'https://fizennn.click/stripe/webhook';
const WEBHOOK_SECRET = 'whsec_IRJGcDEDQa4AISPF9VriUgtcDmPakyJ9';

// Payload giả lập từ Stripe giống với webhook thực tế từ Stripe Dashboard
const mockEvent = {
  id: 'evt_test_production',
  object: 'event',
  api_version: '2025-07-30.basil',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'pi_test_production_intent',
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
    id: 'req_test_production',
    idempotency_key: 'test-production-key'
  }
};

// Tạo signature theo cách Stripe thực tế làm
function createStripeSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = timestamp + '.' + payload;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');
  
  return `t=${timestamp},v1=${signature}`;
}

async function testProductionWebhook() {
  console.log('🌐 Testing Production Webhook...');
  console.log(`🎯 Target URL: ${WEBHOOK_URL}`);
  console.log('');
  
  try {
    // 1. Test endpoint availability
    console.log('1️⃣ Testing webhook endpoint availability...');
    const payload = JSON.stringify(mockEvent);
    const signature = createStripeSignature(payload, WEBHOOK_SECRET);
    
    console.log(`📤 Sending POST request...`);
    console.log(`📝 Payload size: ${payload.length} bytes`);
    console.log(`🔐 Signature: ${signature.substring(0, 50)}...`);
    console.log('');
    
    const response = await axios.post(WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
        'User-Agent': 'Stripe/v1 webhookbot'
      },
      timeout: 10000 // 10 seconds timeout
    });
    
    console.log('✅ Production webhook test successful!');
    console.log(`📊 Status: ${response.status}`);
    console.log(`📄 Response:`, response.data);
    console.log('');
    console.log('🎉 Your webhook is working correctly on production!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Production webhook test failed!');
    console.error('');
    
    if (error.response) {
      console.error(`📊 HTTP Status: ${error.response.status}`);
      console.error(`📄 Response Body:`, error.response.data);
      console.error(`🔍 Response Headers:`, error.response.headers);
      
      if (error.response.status === 400) {
        const errorMsg = error.response.data?.error || 'Unknown error';
        console.error('');
        console.error('🔍 Analysis:');
        if (errorMsg.includes('No raw body found')) {
          console.error('   ❌ The raw body middleware is not working correctly');
          console.error('   💡 Make sure server has been restarted with new code');
        } else if (errorMsg.includes('Invalid webhook signature')) {
          console.error('   ❌ Webhook signature verification failed');
          console.error('   💡 Check if STRIPE_WEBHOOK_SECRET matches your Stripe Dashboard');
        } else {
          console.error(`   ❌ Error: ${errorMsg}`);
        }
      }
      
    } else if (error.request) {
      console.error('📡 No response received from server');
      console.error('💡 Possible issues:');
      console.error('   - Server is not running');
      console.error('   - Domain/SSL issues');
      console.error('   - Network connectivity problems');
      console.error('   - Firewall blocking requests');
      
    } else {
      console.error('⚠️ Request setup error:', error.message);
    }
    
    return false;
  }
}

async function testWebhookConfigEndpoint() {
  console.log('2️⃣ Testing webhook configuration endpoint...');
  
  try {
    const configResponse = await axios.get('https://fizennn.click/stripe/webhook-test', {
      timeout: 5000
    });
    
    console.log('✅ Config endpoint accessible');
    console.log('📄 Config:', configResponse.data);
    console.log('');
    
    return configResponse.data;
    
  } catch (error) {
    console.error('❌ Config endpoint test failed');
    if (error.response) {
      console.error(`📊 Status: ${error.response.status}`);
    } else {
      console.error('📡 No response from config endpoint');
    }
    console.error('');
    return null;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Production Webhook Test');
  console.log('🌐 Domain: https://fizennn.click');
  console.log('🎯 Endpoint: /stripe/webhook');
  console.log('');
  
  // Test config endpoint first
  const config = await testWebhookConfigEndpoint();
  
  // Test main webhook
  const webhookResult = await testProductionWebhook();
  
  console.log('');
  console.log('📋 Test Summary:');
  console.log(`   Config Endpoint: ${config ? '✅ Working' : '❌ Failed'}`);
  console.log(`   Webhook Endpoint: ${webhookResult ? '✅ Working' : '❌ Failed'}`);
  
  if (webhookResult) {
    console.log('');
    console.log('🎉 SUCCESS! Your production webhook is ready for Stripe!');
    console.log('📝 Next steps:');
    console.log('   1. Update your Stripe Dashboard webhook URL to: https://fizennn.click/stripe/webhook');
    console.log('   2. Make sure to select the events: payment_intent.succeeded, payment_intent.payment_failed');
    console.log('   3. Copy the webhook secret and update your .env file');
  }
}

if (require.main === module) {
  main();
}

module.exports = { testProductionWebhook, createStripeSignature };
