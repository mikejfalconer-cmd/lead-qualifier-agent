import fetch from 'node-fetch';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const WEBHOOK_URL = 'http://localhost:4000/api/email/receive';
const TEST_EMAIL = 'leads-1@leadqualifierpro.resend.dev';

console.log('🧪 Email Receiving Test Suite\n');
console.log('Configuration:');
console.log(`  Resend API Key: ${RESEND_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`  Webhook URL: ${WEBHOOK_URL}`);
console.log(`  Test Email: ${TEST_EMAIL}\n`);

// Test 1: Check webhook is running
console.log('Test 1: Checking webhook endpoint...');
try {
  const healthResponse = await fetch('http://localhost:4000/health');
  if (healthResponse.ok) {
    console.log('✅ Webhook endpoint is running\n');
  } else {
    console.log('❌ Webhook endpoint returned error\n');
  }
} catch (error) {
  console.log(`❌ Cannot reach webhook: ${error.message}\n`);
  process.exit(1);
}

// Test 2: Simulate webhook call (what Resend will send)
console.log('Test 2: Simulating webhook call...');
try {
  const webhookPayload = {
    type: 'email.received',
    data: {
      from: 'test@example.com',
      to: TEST_EMAIL,
      subject: 'Test Email for Lead Qualifier Pro',
      text: 'This is a test email to verify email receiving works.'
    }
  };
  
  const webhookResponse = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload)
  });
  
  if (webhookResponse.ok) {
    const result = await webhookResponse.json();
    console.log(`✅ Webhook received and processed`);
    console.log(`   Response: ${JSON.stringify(result)}\n`);
  } else {
    console.log(`❌ Webhook returned error: ${webhookResponse.status}\n`);
  }
} catch (error) {
  console.log(`❌ Error calling webhook: ${error.message}\n`);
}

console.log('✅ Email receiving test complete!');
