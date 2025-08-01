console.log('=== Kiểm tra Webhook Configuration ===\n');

// Kiểm tra các biến môi trường
const envVars = {
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  PORT: process.env.PORT || 3001
};

console.log('Environment Variables:');
Object.entries(envVars).forEach(([key, value]) => {
  const exists = !!value;
  const length = value?.length || 0;
  const preview = value?.substring(0, 10) || 'N/A';
  
  console.log(`  ${key}:`);
  console.log(`    - Tồn tại: ${exists ? '✅' : '❌'}`);
  console.log(`    - Độ dài: ${length}`);
  console.log(`    - Preview: ${preview}`);
  console.log('');
});

// Kiểm tra format
console.log('Format Validation:');
const webhookSecret = envVars.STRIPE_WEBHOOK_SECRET;
const secretKey = envVars.STRIPE_SECRET_KEY;

if (webhookSecret) {
  console.log(`  STRIPE_WEBHOOK_SECRET format: ${webhookSecret.startsWith('whsec_') ? '✅' : '❌'}`);
} else {
  console.log('  STRIPE_WEBHOOK_SECRET: ❌ Chưa cấu hình');
}

if (secretKey) {
  console.log(`  STRIPE_SECRET_KEY format: ${secretKey.startsWith('sk_') ? '✅' : '❌'}`);
} else {
  console.log('  STRIPE_SECRET_KEY: ❌ Chưa cấu hình');
}

console.log('\n=== Hướng dẫn khắc phục ===');
console.log('1. Tạo file .env trong thư mục gốc');
console.log('2. Thêm các biến môi trường:');
console.log('   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret');
console.log('   STRIPE_SECRET_KEY=sk_test_your_secret_key');
console.log('3. Restart server');
console.log('\n4. Test webhook:');
console.log('   GET http://localhost:3001/stripe/webhook-test'); 