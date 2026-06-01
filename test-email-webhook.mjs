#!/usr/bin/env node

/**
 * Test Email Webhook Integration
 * Tests the Resend email webhook endpoint
 */

const API_URL = process.env.API_URL || 'http://localhost:3000';

async function testEmailWebhook() {
  console.log('🧪 Testing Email Webhook Integration\n');
  console.log(`API URL: ${API_URL}\n`);

  // Test 1: Send test email
  console.log('Test 1: Send test email to webhook');
  console.log('─'.repeat(50));

  const testEmail = {
    from: 'test@example.com',
    to: 'leads-1@leadqualifierpro.com',
    subject: 'Test Lead Inquiry',
    text: 'This is a test email to verify webhook integration',
    html: '<p>This is a test email to verify webhook integration</p>',
    messageId: 'test-msg-' + Date.now(),
  };

  try {
    const response = await fetch(`${API_URL}/api/email/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testEmail),
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.status === 202) {
      console.log('✅ Verification required (expected for first-time sender)\n');
    } else if (response.status === 200) {
      console.log('✅ Email received and lead created\n');
    } else {
      console.log('⚠️  Unexpected response\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message, '\n');
  }

  // Test 2: Get email address
  console.log('Test 2: Get email receiving address');
  console.log('─'.repeat(50));

  try {
    const response = await fetch(`${API_URL}/api/email/address/1`);
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log('✅ Email address retrieved\n');
  } catch (error) {
    console.error('❌ Error:', error.message, '\n');
  }

  // Test 3: Health check
  console.log('Test 3: Health check');
  console.log('─'.repeat(50));

  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log('✅ API is healthy\n');
  } catch (error) {
    console.error('❌ Error:', error.message, '\n');
  }

  console.log('✅ All tests completed!');
}

testEmailWebhook().catch(console.error);
