const crypto = require('crypto');

// Test webhook signature
function testWebhookSignature() {
  const secret = 'whsec_test_secret'; // Thay bằng webhook secret thật
  const payload = JSON.stringify({
    id: 'evt_test',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test',
        amount: 1000,
        currency: 'vnd',
        metadata: {
          orderId: 'order_123'
        }
      }
    }
  });

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  console.log('Test webhook signature:');
  console.log('Payload:', payload);
  console.log('Signature:', `sha256=${signature}`);
  console.log('Secret:', secret);
  console.log('---');
}

// Test cURL command
function generateCurlCommand() {
  const secret = 'whsec_test_secret'; // Thay bằng webhook secret thật
  const payload = JSON.stringify({
    id: 'evt_test',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test',
        amount: 1000,
        currency: 'vnd',
        metadata: {
          orderId: 'order_123'
        }
      }
    }
  });

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const curlCommand = `curl -X POST http://localhost:3001/stripe/webhook \\
  -H "Content-Type: application/json" \\
  -H "stripe-signature: sha256=${signature}" \\
  -d '${payload}'`;

  console.log('cURL command to test webhook:');
  console.log(curlCommand);
  console.log('---');
}

testWebhookSignature();
generateCurlCommand(); 