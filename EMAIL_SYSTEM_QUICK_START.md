# Email System - Quick Start Guide

## For End Users (Your Clients)

### How to Start Receiving Leads

1. **Get Your Forwarding Email Address**
   ```
   leads-{clientId}@leadqualifierpro.resend.dev
   ```
   Example: `leads-2@leadqualifierpro.resend.dev`

2. **Forward Your Leads**
   - Set up email forwarding in your email provider (Gmail, Outlook, etc.)
   - Forward all lead emails to your assigned forwarding address
   - Or manually forward individual lead emails

3. **First-Time Sender Verification**
   - When a new sender emails your forwarding address, they'll receive a verification code
   - They must reply with the code to verify their email
   - After verification, their emails are automatically processed as leads

4. **View Your Leads**
   - Log into your Lead Qualifier Pro dashboard
   - Navigate to "Leads" section
   - See all received leads with qualification scores

---

## For Developers

### Setup

1. **Environment Variables**
   ```bash
   DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   PORT=4000
   ```

2. **Start Server**
   ```bash
   npm run dev
   ```

3. **Test Email Receiving**
   ```bash
   # Get forwarding address for client
   curl http://localhost:4000/api/email/address/2

   # Send verification code
   curl -X POST http://localhost:4000/api/email/send-verification \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "clientId": 2}'

   # Verify email
   curl -X POST http://localhost:4000/api/email/verify \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "code": "XXXXXX"}'

   # Send email
   curl -X POST http://localhost:4000/api/email/receive \
     -H "Content-Type: application/json" \
     -d '{
       "from": "test@example.com",
       "to": "leads-2@leadqualifierpro.resend.dev",
       "subject": "Lead Subject",
       "text": "Lead message body"
     }'
   ```

### API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/email/receive` | POST | Receive incoming email |
| `/api/email/verify` | POST | Verify sender with code |
| `/api/email/send-verification` | POST | Send verification code |
| `/api/email/address/:clientId` | GET | Get forwarding address |
| `/api/email/verify-status/:email` | GET | Check verification status |
| `/api/email/logs/:clientId` | GET | Get email logs |

### Database Queries

```sql
-- Get all leads for a client
SELECT * FROM leads WHERE client_id = 2 ORDER BY created_at DESC;

-- Get uncontacted leads
SELECT * FROM leads WHERE status = 'new' AND client_id = 2;

-- Get email logs
SELECT * FROM email_logs WHERE client_id = 2 ORDER BY timestamp DESC;

-- Get verification status
SELECT * FROM email_verifications WHERE email = 'test@example.com';
```

### Common Issues

**Issue:** "Email not verified"
- **Solution:** Call `/api/email/send-verification` to send code, then `/api/email/verify` to verify

**Issue:** "Client not found"
- **Solution:** Ensure client exists in database and clientId is correct

**Issue:** "Database connection error"
- **Solution:** Check DATABASE_URL and SSL settings; ensure `sslmode=require`

**Issue:** "Invalid email address format"
- **Solution:** Verify email addresses are valid (contain @ and domain)

---

## Architecture Overview

```
Email Flow:
┌─────────────────┐
│ External Email  │
│ (from sender)   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ POST /api/email/receive             │
│ (Resend webhook)                    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Check Verification Status           │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │          │
    ▼          ▼
Verified   Not Verified
    │          │
    │          ▼
    │    Send Code Email
    │          │
    │          ▼
    │    POST /api/email/verify
    │          │
    │          ▼
    │       Verified
    │          │
    └────┬─────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Parse Email Content                 │
│ Extract Lead Data                   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Create Lead Record                  │
│ INSERT INTO leads                   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Log Email Transaction               │
│ INSERT INTO email_logs              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Return Success Response             │
│ leadId, clientId                    │
└─────────────────────────────────────┘
```

---

## Next Steps

1. **AI Qualification** - Automatically score leads using LLM
2. **Follow-ups** - Send automated follow-up emails
3. **Dashboard** - Display leads in web interface
4. **Billing** - Integrate Stripe for usage-based pricing

---

## Support

For issues or questions:
1. Check the logs: `npm run dev` (server output)
2. Review the API responses for error messages
3. Check database for data persistence
4. Consult the full completion report: `EMAIL_SYSTEM_COMPLETION_REPORT.md`
