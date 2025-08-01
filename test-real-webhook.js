const crypto = require('crypto');

// Dữ liệu webhook thật từ Stripe (từ log bạn cung cấp)
const realWebhookData = {
  "id": "evt_3RrIWKKglyNLhqOw11oqcbcN",
  "object": "event",
  "api_version": "2025-07-30.basil",
  "created": 1754053057,
  "data": {
    "object": {
      "id": "pi_3RrIWKKglyNLhqOw1TCXIM9R",
      "object": "payment_intent",
      "amount": 10000,
      "amount_capturable": 0,
      "amount_details": {
        "tip": {}
      },
      "amount_received": 10000,
      "application": null,
      "application_fee_amount": null,
      "automatic_payment_methods": null,
      "canceled_at": null,
      "cancellation_reason": null,
      "capture_method": "automatic",
      "client_secret": "pi_3RrIWKKglyNLhqOw1TCXIM9R_secret_XF3Pqoc3ARFiZhswifDHIhBRR",
      "confirmation_method": "automatic",
      "created": 1754053032,
      "currency": "vnd",
      "customer": null,
      "description": null,
      "last_payment_error": null,
      "latest_charge": "ch_3RrIWKKglyNLhqOw1VPeCDKr",
      "livemode": false,
      "metadata": {
        "orderId": "688cb9a79557640f190c8047"
      },
      "next_action": null,
      "on_behalf_of": null,
      "payment_method": "pm_1RrIWiKglyNLhqOwZ3PY4OqX",
      "payment_method_configuration_details": null,
      "payment_method_options": {
        "card": {
          "installments": null,
          "mandate_options": null,
          "network": null,
          "request_three_d_secure": "automatic"
        }
      },
      "payment_method_types": ["card"],
      "processing": null,
      "receipt_email": null,
      "review": null,
      "setup_future_usage": null,
      "shipping": null,
      "source": null,
      "statement_descriptor": null,
      "statement_descriptor_suffix": null,
      "status": "succeeded",
      "transfer_data": null,
      "transfer_group": null
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_9D0kVPMYqFETNj",
    "idempotency_key": "ab629b44-0d0b-47fb-876c-4d4c61693a7a"
  },
  "type": "payment_intent.succeeded"
};

function testRealWebhook() {
  const payload = JSON.stringify(realWebhookData);
  const secret = 'whsec_test_secret'; // Thay bằng webhook secret thật
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  console.log('=== Test với dữ liệu webhook thật từ Stripe ===\n');
  console.log('Payload length:', payload.length);
  console.log('Signature:', `sha256=${signature}`);
  console.log('Secret:', secret);
  console.log('');
  
  // Tạo cURL command
  const curlCommand = `curl -X POST http://localhost:3001/stripe/webhook \\
  -H "Content-Type: application/json" \\
  -H "stripe-signature: sha256=${signature}" \\
  -d '${payload.replace(/'/g, "'\\''")}'`;
  
  console.log('cURL command:');
  console.log(curlCommand);
  console.log('');
  
  // Tạo fetch command cho testing
  const fetchCommand = `fetch('http://localhost:3001/stripe/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'stripe-signature': 'sha256=${signature}'
  },
  body: JSON.stringify(${JSON.stringify(realWebhookData, null, 2)})
})`;
  
  console.log('Fetch command:');
  console.log(fetchCommand);
}

testRealWebhook(); 