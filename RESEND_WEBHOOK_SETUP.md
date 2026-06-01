# Resend Email Webhook Setup Guide

**Last Updated:** June 1, 2026  
**Status:** Production Ready

---

## Overview

This guide explains how to configure Resend to forward incoming emails to the Lead Qualifier Pro API webhook endpoint. This enables the system to automatically receive and process lead inquiries via email.

---

## Prerequisites

- ✅ Resend account (https://resend.com)
- ✅ Resend API key (already configured in environment)
- ✅ Lead Qualifier Pro backend deployed and running
- ✅ Custom domain or Resend subdomain for email receiving

---

## Architecture

```
Sender Email
    ↓
Resend (Email Receiving)
    ↓
POST /api/email/receive webhook
    ↓
Lead Qualifier Pro Backend
    ↓
Email Verification (if first-time sender)
    ↓
Lead Creation & AI Qualification
    ↓
Database Storage
```

---

## Step 1: Set Up Resend Email Receiving Domain

### Option A: Use Resend Subdomain (Recommended for Testing)

1. Go to https://resend.com/dashboard
2. Navigate to **Domains**
3. Click **Add Domain**
4. Choose **Resend Subdomain** option
5. Enter your subdomain (e.g., `leads.resend.dev`)
6. Resend will automatically verify the domain

**Your email receiving address will be:** `leads@yourdomain.resend.dev`

### Option B: Use Custom Domain (Recommended for Production)

1. Go to https://resend.com/dashboard
2. Navigate to **Domains**
3. Click **Add Domain**
4. Enter your custom domain (e.g., `leadqualifierpro.com`)
5. Add the DNS records provided by Resend to your domain registrar:
   - MX records
   - TXT records (SPF, DKIM)
6. Wait for DNS verification (usually 5-30 minutes)

**Your email receiving address will be:** `leads@leadqualifierpro.com`

---

## Step 2: Create Resend Email Forwarding Rule

### Set Up Email Routing

1. In Resend Dashboard, go to **Email Routing**
2. Click **Create Route**
3. Configure:
   - **Match:** `leads@yourdomain.com` (or your subdomain)
   - **Forward to:** Your webhook URL (see Step 3)
   - **Action:** Forward to webhook

### Webhook Configuration

- **Webhook URL:** `https://your-api-url.railway.app/api/email/receive`
- **Method:** POST
- **Content-Type:** application/json

---

## Step 3: Configure Webhook Endpoint

### Webhook URL Format

Replace `your-api-url` with your actual Railway deployment URL:

```
https://lead-qualifier-agent-production-dabf.up.railway.app/api/email/receive
```

### Webhook Payload Format

Resend will send emails as JSON POST requests with this structure:

```json
{
  "from": "sender@example.com",
  "to": "leads@yourdomain.com",
  "subject": "Inquiry about your services",
  "text": "I'm interested in learning more...",
  "html": "<p>I'm interested in learning more...</p>",
  "messageId": "msg_xxxxxxxxxxxxx"
}
```

### Webhook Response

The endpoint expects a 200 OK response:

```json
{
  "success": true,
  "leadId": 123,
  "clientId": 1,
  "message": "Email received and lead created"
}
```

---

## Step 4: Test Email Receiving

### Test 1: Send Test Email

1. Send an email to your configured address:
   ```
   To: leads@yourdomain.com
   Subject: Test Lead
   Body: This is a test email
   ```

2. Check the API logs:
   ```bash
   curl https://your-api-url/health
   ```

3. Verify the lead was created:
   ```bash
   curl -X GET https://your-api-url/api/leads \
     -H "X-API-Key: your-client-api-key"
   ```

### Test 2: Verify Email Verification Flow

1. Send email from a new address
2. Check logs for verification code
3. Reply with verification code
4. Confirm lead is created after verification

### Test 3: Check Email Logs

```bash
curl -X GET https://your-api-url/api/email/logs/1 \
  -H "X-API-Key: your-client-api-key"
```

---

## Step 5: Configure for Multiple Clients

### Email Address Pattern

Each client gets a unique email address:

```
leads-{clientId}@yourdomain.com
```

**Examples:**
- Client 1: `leads-1@yourdomain.com`
- Client 2: `leads-2@yourdomain.com`
- Client 3: `leads-3@yourdomain.com`

### Set Up Multiple Routes

In Resend Email Routing, create a catch-all rule:

1. **Match:** `leads-*@yourdomain.com`
2. **Forward to:** `https://your-api-url/api/email/receive`
3. The backend will automatically extract the client ID from the email address

---

## Environment Variables

Ensure these are set in your Railway deployment:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

The API key is used for:
- Sending verification emails
- Sending follow-up emails
- Email tracking (future)

---

## Email Verification Flow

### First-Time Sender

1. Email arrives at webhook
2. System checks if sender is verified
3. If not verified:
   - Generate 6-character verification code
   - Send verification email via Resend
   - Return 202 Accepted response
4. Sender receives verification email with code
5. Sender replies with code
6. System verifies code and creates lead

### Subsequent Emails

1. Email arrives at webhook
2. System checks if sender is verified
3. If verified:
   - Create lead immediately
   - Run AI qualification
   - Store in database
   - Return 200 OK response

---

## Troubleshooting

### Issue: Emails not being received

**Check:**
1. ✅ Resend API key is valid
2. ✅ Webhook URL is correct and accessible
3. ✅ Email routing rule is configured
4. ✅ Domain is verified in Resend
5. ✅ Check Resend logs for delivery errors

```bash
# Test webhook connectivity
curl -X POST https://your-api-url/api/email/receive \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "to": "leads@yourdomain.com",
    "subject": "Test",
    "text": "Test email"
  }'
```

### Issue: Verification emails not sending

**Check:**
1. ✅ RESEND_API_KEY is set
2. ✅ Resend account has email sending enabled
3. ✅ Check Resend dashboard for failed sends
4. ✅ Verify "from" email address is authorized

### Issue: Leads not being created

**Check:**
1. ✅ Client exists in database
2. ✅ Client ID in email address is correct
3. ✅ Database connection is working
4. ✅ Check server logs for errors

```bash
# View server logs
tail -f /var/log/lead-qualifier-pro.log
```

---

## Production Checklist

- [ ] Custom domain configured in Resend
- [ ] DNS records verified
- [ ] Email routing rules created
- [ ] Webhook URL is HTTPS
- [ ] RESEND_API_KEY is set in production
- [ ] Test emails verified working
- [ ] Verification flow tested
- [ ] Multiple clients tested
- [ ] Error handling tested
- [ ] Monitoring alerts configured

---

## Customer Setup Instructions

### For Each New Customer

1. **Provide email address:**
   ```
   leads-{clientId}@yourdomain.com
   ```

2. **Instructions:**
   - Forward your lead emails to this address
   - First email will require verification
   - Subsequent emails will be automatically processed
   - Leads appear in dashboard within seconds

3. **Example:**
   ```
   Customer receives inquiry email
   ↓
   Customer forwards to: leads-1@leadqualifierpro.com
   ↓
   System sends verification code
   ↓
   Customer replies with code
   ↓
   Lead appears in dashboard
   ↓
   AI qualification runs automatically
   ↓
   Follow-up email sent (if configured)
   ```

---

## API Endpoints

### Receive Email
```
POST /api/email/receive
Content-Type: application/json

{
  "from": "sender@example.com",
  "to": "leads-1@yourdomain.com",
  "subject": "Inquiry",
  "text": "Email content",
  "html": "<p>Email content</p>",
  "messageId": "msg_xxxxx"
}

Response:
{
  "success": true,
  "leadId": 123,
  "clientId": 1,
  "message": "Email received and lead created"
}
```

### Get Email Address
```
GET /api/email/address/:clientId

Response:
{
  "success": true,
  "clientId": 1,
  "emailAddress": "leads-1@yourdomain.com"
}
```

### Verify Email
```
POST /api/email/verify
Content-Type: application/json

{
  "email": "sender@example.com",
  "code": "ABC123"
}

Response:
{
  "success": true,
  "message": "Email verified successfully",
  "clientId": 1
}
```

### Get Email Logs
```
GET /api/email/logs/:clientId?limit=50&offset=0
X-API-Key: your-api-key

Response:
{
  "success": true,
  "clientId": 1,
  "count": 10,
  "logs": [...]
}
```

---

## Next Steps

1. ✅ Configure Resend domain
2. ✅ Set up email routing
3. ✅ Test webhook connectivity
4. ✅ Test email receiving
5. ⏭️ Configure customer email forwarding
6. ⏭️ Set up follow-up email templates
7. ⏭️ Configure analytics and reporting

---

## Support

For issues or questions:
1. Check this guide's troubleshooting section
2. Review server logs
3. Check Resend dashboard for email delivery status
4. Contact support@leadqualifierpro.com

---

**Document Version:** 1.0  
**Last Updated:** June 1, 2026  
**Status:** Production Ready ✅
