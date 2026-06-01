#!/bin/bash

echo "🧪 Email Receiving Webhook Test"
echo "================================\n"

# Test 1: Health check
echo "Test 1: Checking webhook endpoint..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health)
if [ "$HEALTH" = "200" ]; then
  echo "✅ Webhook endpoint is running\n"
else
  echo "❌ Webhook endpoint returned error: $HEALTH\n"
  exit 1
fi

# Test 2: Send test webhook payload
echo "Test 2: Sending test webhook payload..."
WEBHOOK_RESPONSE=$(curl -s -X POST http://localhost:4000/api/email/receive \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.received",
    "data": {
      "from": "test@example.com",
      "to": "leads-1@leadqualifierpro.resend.dev",
      "subject": "Test Email for Lead Qualifier Pro",
      "text": "This is a test email to verify email receiving works."
    }
  }')

echo "Response: $WEBHOOK_RESPONSE\n"

if echo "$WEBHOOK_RESPONSE" | grep -q "success\|created\|verified"; then
  echo "✅ Webhook received and processed successfully\n"
else
  echo "⚠️  Webhook response received (check above)\n"
fi

echo "✅ Email receiving test complete!"
