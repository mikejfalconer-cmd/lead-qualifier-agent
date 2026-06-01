# Resend Email Receiving Setup Guide

**Date:** June 1, 2026  
**Status:** Ready for Manual Configuration  
**Estimated Time:** 15-20 minutes

---

## Overview

This guide walks you through setting up Resend email receiving for Lead Qualifier Pro. Your backend is ready to receive emails via webhook—this guide helps you configure Resend to forward emails to your system.

---

## Step 1: Access Your Resend Dashboard

1. Go to https://resend.com/dashboard
2. Sign in with your account (mikejfalconer@gmail.com)
3. You should see your project dashboard

---

## Step 2: Create or Verify Domain

### Option A: Use Resend Subdomain (Recommended for Testing)

**Resend subdomains are automatically verified and ready to use immediately.**

1. In Resend dashboard, go to **Domains**
2. Look for or create domain: `leadqualifierpro.resend.dev`
3. If it doesn't exist, click **Add Domain** and enter: `leadqualifierpro.resend.dev`
4. Resend will automatically verify the subdomain
5. Status should show as **Verified** ✅

### Option B: Use Custom Domain (For Production)

If you purchase a custom domain later:

1. Click **Add Domain**
2. Enter your domain (e.g., `leadqualifierpro.com`)
3. Resend will provide DNS records to add
4. Add records to your domain registrar
5. Wait for DNS propagation (usually 5-30 minutes)
6. Resend will verify automatically

---

## Step 3: Email Receiving Configuration

### Current Setup

Your backend webhook is ready at:
```
https://lead-qualifier-agent-production-dabf.up.railway.app/api/email/receive
```

### Email Address Format

Once Resend is configured, customers will forward emails to:
```
leads-{clientId}@leadqualifierpro.resend.dev
```

**Examples:**
- `leads-1@leadqualifierpro.resend.dev` (for client ID 1)
- `leads-2@leadqualifierpro.resend.dev` (for client ID 2)
- etc.

---

## Step 4: Test Email Receiving

### Manual Test

1. **Send a test email:**
   - From: Any email address (e.g., your personal email)
   - To: `leads-1@leadqualifierpro.resend.dev`
   - Subject: "Test Lead Inquiry"
   - Body: "This is a test email"

2. **Check server logs:**
   - Go to Railway dashboard
   - Select Lead Qualifier Pro project
   - Check logs for verification code
   - You should see: `[EmailVerification] Verification code sent: XXXXXX`

3. **Reply with verification code:**
   - Reply to the verification email with the code
   - System will verify the sender
   - Lead will be created in database

4. **Verify in dashboard:**
   - Check your Lead Qualifier Pro dashboard
   - New lead should appear from the test email

---

## Step 5: Production Deployment

### Railway Configuration

Your production server is already configured with:
- ✅ RESEND_API_KEY (set in Railway variables)
- ✅ DATABASE_URL (set in Railway variables)
- ✅ Webhook endpoint ready

### Deploy Code

1. Changes are already committed to GitHub
2. Railway auto-deploys on push
3. Verify deployment in Railway dashboard

### Test Production Webhook

```bash
curl -X POST https://lead-qualifier-agent-production-dabf.up.railway.app/api/email/receive \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@example.com",
    "to": "leads-1@leadqualifierpro.resend.dev",
    "subject": "Test",
    "text": "Test email"
  }'
```

---

## Email Verification Flow

```
1. Sender sends email to leads-1@leadqualifierpro.resend.dev
   ↓
2. Resend receives email
   ↓
3. Resend forwards to webhook: POST /api/email/receive
   ↓
4. Backend checks if sender is verified
   ├─ If NOT verified:
   │  ├─ Generate 6-character code
   │  ├─ Send verification email via Resend
   │  └─ Return 202 Accepted
   │
   └─ If verified:
      ├─ Create lead in database
      ├─ Run AI qualification
      ├─ Log email
      └─ Return 200 OK
```

---

## Customer Setup Instructions

When you onboard customers, provide them with:

### Email Forwarding Setup

1. **Get your email address:**
   - Your unique email: `leads-{yourClientId}@leadqualifierpro.resend.dev`
   - Example: `leads-123@leadqualifierpro.resend.dev`

2. **Forward emails to this address:**
   - Set up email forwarding in your email provider
   - Or use email filters to auto-forward
   - Or manually forward emails

3. **First-time sender verification:**
   - When you forward an email for the first time, you'll receive a verification code
   - Reply with the code to complete verification
   - After that, all emails are automatically processed

4. **Dashboard access:**
   - Log in to Lead Qualifier Pro dashboard
   - View all received leads
   - See AI qualification results
   - Manage follow-ups

---

## Troubleshooting

### Issue: Emails not being received

**Check:**
1. Resend domain is verified (status: ✅ Verified)
2. Email address is correct: `leads-{clientId}@leadqualifierpro.resend.dev`
3. Backend server is running
4. Check Railway logs for errors

**Solution:**
1. Verify domain in Resend dashboard
2. Test webhook connectivity: `curl https://lead-qualifier-agent-production-dabf.up.railway.app/health`
3. Check server logs for error messages
4. Verify RESEND_API_KEY is set in Railway

### Issue: Verification code not received

**Check:**
1. RESEND_API_KEY is set in Railway
2. Email verification service is running
3. Check server logs for verification code generation

**Solution:**
1. Verify RESEND_API_KEY in Railway variables
2. Check server logs: `[EmailVerification] Verification code sent`
3. Check spam folder for verification email
4. Resend account has email sending enabled

### Issue: Lead not created after verification

**Check:**
1. Database connection is working
2. Client exists in database
3. Email address format is correct

**Solution:**
1. Verify DATABASE_URL in Railway
2. Check server logs for database errors
3. Verify client ID in email address

---

## API Reference

### Email Webhook Endpoint

**URL:** `POST /api/email/receive`

**Request:**
```json
{
  "from": "sender@example.com",
  "to": "leads-1@leadqualifierpro.resend.dev",
  "subject": "Email Subject",
  "text": "Email content (plain text)",
  "html": "<p>Email content (HTML)</p>",
  "messageId": "unique-message-id"
}
```

**Response (First-time sender):**
```json
{
  "success": true,
  "status": 202,
  "message": "Verification required",
  "details": "Verification code sent to sender"
}
```

**Response (Verified sender):**
```json
{
  "success": true,
  "status": 200,
  "leadId": 123,
  "clientId": 1,
  "message": "Lead created and qualified"
}
```

---

## Next Steps

### Immediate
- [ ] Set up Resend domain
- [ ] Send test email
- [ ] Verify webhook receives email
- [ ] Complete verification flow
- [ ] Confirm lead appears in dashboard

### This Week
- [ ] Test with real customer email
- [ ] Create customer onboarding guide
- [ ] Onboard first beta customer

### Next Week
- [ ] Set up custom domain (if needed)
- [ ] Configure DNS records
- [ ] Test production email receiving
- [ ] Launch to first customers

---

## Support

For issues or questions:

1. **Check this guide's troubleshooting section**
2. **Review server logs in Railway dashboard**
3. **Test webhook connectivity**
4. **Verify all environment variables are set**

---

## Files & Resources

- **Backend Code:** `/home/ubuntu/lead-qualifier-pro/src/services/emailVerification.ts`
- **Test Script:** `/home/ubuntu/lead-qualifier-pro/test-email-webhook.mjs`
- **Documentation:** `RESEND_WEBHOOK_SETUP.md`
- **Resend Dashboard:** https://resend.com/dashboard

---

**Status:** Ready for Manual Setup  
**Estimated Time:** 15-20 minutes  
**Next Phase:** Email Receiving Testing

