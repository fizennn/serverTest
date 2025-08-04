const axios = require('axios');

async function testWebhook() {
  try {
    console.log('Testing PayOS webhook endpoint...');
    
    const testPayload = {
      error: 0,
      message: 'Success',
      data: {
        orderCode: 'TEST123',
        amount: 100000,
        status: 'PAID',
        transactionId: 'TXN123456',
        paymentMethod: 'BANK_TRANSFER',
        paidAt: Date.now(),
        description: 'Test payment'
      }
    };

    const response = await axios.post('http://localhost:3000/webhook/payos', testPayload, {
      headers: {
        'Content-Type': 'application/json',
        'x-payos-signature': 'test-signature'
      }
    });

    console.log('✅ Webhook test successful!');
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
  } catch (error) {
    console.log('❌ Webhook test failed!');
    console.log('Status:', error.response?.status);
    console.log('Response:', error.response?.data);
    console.log('Error:', error.message);
  }
}

testWebhook(); 