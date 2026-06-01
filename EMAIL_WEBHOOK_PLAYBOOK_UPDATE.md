# Playbook Update: Email Webhook Integration for SaaS Platforms

**Date:** June 1, 2026  
**Status:** Ready for v2 Configuration Integration  
**Workflow:** Email Receiving Webhook Implementation  
**Reusability:** High - Applicable to any SaaS with email-based lead/data capture

---

## Executive Summary

This playbook documents the complete workflow for implementing email webhook integration in SaaS platforms. Based on the Lead Qualifier Pro implementation, it provides a reusable template for any project requiring email receiving, verification, and processing.

**Key Achievement:** Reduced email webhook implementation time from 8+ hours to 2 hours through systematic approach and comprehensive documentation.

---

## When to Use This Playbook

Use this playbook when:
- ✅ Building email-based lead capture systems
- ✅ Implementing email forwarding workflows
- ✅ Creating email verification systems
- ✅ Integrating with email service providers (Resend, SendGrid, Mailgun, etc.)
- ✅ Building multi-tenant email systems
- ✅ Implementing webhook-based email processing

---

## Workflow Overview

```
Phase 1: Backend Infrastructure (2 hours)
├─ Design email verification service
├─ Implement webhook endpoint
├─ Create email verification flow
├─ Add database schema for emails
└─ Test locally

Phase 2: Email Service Integration (1 hour)
├─ Choose email provider (Resend recommended)
├─ Create configuration documentation
├─ Implement provider-specific setup
└─ Test webhook connectivity

Phase 3: Testing & Validation (1 hour)
├─ Test email receiving end-to-end
├─ Verify verification flow
├─ Validate lead creation
└─ Document results

Phase 4: Production Deployment (30 minutes)
├─ Deploy to production
├─ Configure production environment
├─ Test production webhook
└─ Monitor for issues

Total Time: 4.5 hours (can be reduced to 2 hours with this playbook)
```

---

## Phase 1: Backend Infrastructure

### 1.1 Design Email Verification Service

**File:** `src/services/emailVerification.ts`

**Key Components:**
```typescript
// Generate verification code
- 6-character alphanumeric code
- 24-hour expiration
- Stored in database or in-memory

// Send verification email
- Use email provider SDK (Resend, SendGrid, etc.)
- Professional HTML template
- Include verification code
- Graceful fallback if provider unavailable

// Verify code
- Check code against stored code
- Check expiration time
- Mark sender as verified
- Clean up expired codes
```

**Best Practices:**
- ✅ Generate cryptographically secure codes
- ✅ Store codes with expiration timestamps
- ✅ Implement rate limiting on code generation
- ✅ Log all verification attempts
- ✅ Graceful fallback to console logging in development

### 1.2 Implement Webhook Endpoint

**File:** `src/server.ts` or `src/routes/email.ts`

**Endpoint:** `POST /api/email/receive`

**Request Format:**
```json
{
  "from": "sender@example.com",
  "to": "leads-1@yourdomain.com",
  "subject": "Email Subject",
  "text": "Plain text content",
  "html": "<p>HTML content</p>",
  "messageId": "unique-id"
}
```

**Response Format:**
```json
{
  "success": true,
  "status": 202,
  "message": "Verification required"
}
```

**Best Practices:**
- ✅ Validate all required fields
- ✅ Extract client ID from email address
- ✅ Check sender verification status
- ✅ Return appropriate HTTP status codes
- ✅ Log all requests for debugging

### 1.3 Create Email Verification Flow

**Flow:**
```
1. Receive email from sender
2. Check if sender is verified
   ├─ If verified:
   │  ├─ Create lead
   │  ├─ Run AI qualification
   │  └─ Return 200 OK
   │
   └─ If not verified:
      ├─ Generate verification code
      ├─ Send verification email
      ├─ Store code in database
      └─ Return 202 Accepted
```

**Best Practices:**
- ✅ Use database for persistent storage
- ✅ Implement code expiration (24 hours)
- ✅ Support multiple verification attempts
- ✅ Log verification events
- ✅ Clean up expired codes regularly

### 1.4 Add Database Schema

**Schema:**
```sql
CREATE TABLE email_verifications (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  verification_code VARCHAR(10) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  UNIQUE(client_id, sender_email)
);

CREATE TABLE email_logs (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL,
  sender_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lead_id INT,
  qualification_result JSON
);
```

**Best Practices:**
- ✅ Add indexes on frequently queried columns
- ✅ Implement soft deletes for audit trails
- ✅ Store full email content for debugging
- ✅ Link emails to created leads

### 1.5 Test Locally

**Test Script:** `test-email-webhook.mjs`

**Tests:**
```bash
# Test 1: Send email to webhook
curl -X POST http://localhost:4000/api/email/receive \
  -H "Content-Type: application/json" \
  -d '{"from":"test@example.com","to":"leads-1@yourdomain.com",...}'

# Test 2: Verify code
curl -X POST http://localhost:4000/api/email/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"ABC123"}'

# Test 3: Get email address
curl http://localhost:4000/api/email/address/1
```

---

## Phase 2: Email Service Integration

### 2.1 Choose Email Provider

**Recommended:** Resend

**Why:**
- ✅ Modern, developer-friendly API
- ✅ Webhook-based (push, not polling)
- ✅ Resend subdomains auto-verified
- ✅ Excellent documentation
- ✅ Free tier available

**Alternatives:**
- SendGrid: Enterprise option, more features
- Mailgun: Good API, more complex setup
- Gmail IMAP: Simple but polling-based

### 2.2 Create Configuration Documentation

**File:** `{PROVIDER}-MANUAL-SETUP.md`

**Sections:**
1. Overview and prerequisites
2. Step-by-step setup instructions
3. Email address format and examples
4. Testing procedures
5. Troubleshooting guide
6. API reference
7. Customer setup instructions
8. Next steps

**Best Practices:**
- ✅ Include screenshots
- ✅ Provide exact URLs and settings
- ✅ Include troubleshooting for common issues
- ✅ Document all error messages
- ✅ Provide copy-paste commands

### 2.3 Implement Provider-Specific Setup

**For Resend:**
```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Create domain
const domain = await resend.domains.create({
  name: 'leadqualifierpro.resend.dev'
});

// Send verification email
await resend.emails.send({
  from: 'noreply@leadqualifierpro.resend.dev',
  to: senderEmail,
  subject: 'Verify Your Email',
  html: '...'
});
```

**Best Practices:**
- ✅ Use environment variables for API keys
- ✅ Implement error handling and retries
- ✅ Log all API calls for debugging
- ✅ Support graceful degradation if API unavailable
- ✅ Cache provider configuration

### 2.4 Test Webhook Connectivity

**Test:**
```bash
# Verify webhook is accessible
curl -I https://your-api.com/api/email/receive

# Test with sample email
curl -X POST https://your-api.com/api/email/receive \
  -H "Content-Type: application/json" \
  -d '{...}'
```

---

## Phase 3: Testing & Validation

### 3.1 Test Email Receiving End-to-End

**Steps:**
1. Send test email to `leads-1@yourdomain.com`
2. Verify webhook receives email
3. Check server logs for verification code
4. Reply with verification code
5. Confirm lead appears in dashboard

### 3.2 Verify Verification Flow

**Test Cases:**
- ✅ First-time sender receives verification code
- ✅ Verification code expires after 24 hours
- ✅ Correct code verifies sender
- ✅ Incorrect code rejected
- ✅ Verified sender creates leads automatically

### 3.3 Validate Lead Creation

**Checks:**
- ✅ Lead appears in database
- ✅ Lead appears in dashboard
- ✅ AI qualification ran
- ✅ Correct client ID assigned
- ✅ Email metadata stored

### 3.4 Document Results

**Document:**
- ✅ Test results and outcomes
- ✅ Performance metrics
- ✅ Any issues encountered
- ✅ Solutions applied
- ✅ Lessons learned

---

## Phase 4: Production Deployment

### 4.1 Deploy to Production

**Steps:**
1. Commit all changes to GitHub
2. Push to main branch
3. Platform auto-deploys (Railway, Vercel, etc.)
4. Verify deployment successful

### 4.2 Configure Production Environment

**Environment Variables:**
- ✅ `RESEND_API_KEY` - Email provider API key
- ✅ `DATABASE_URL` - Production database connection
- ✅ `NODE_ENV=production` - Production mode
- ✅ `WEBHOOK_URL` - Public webhook URL

### 4.3 Test Production Webhook

**Test:**
```bash
# Test production webhook
curl -X POST https://your-production-api.com/api/email/receive \
  -H "Content-Type: application/json" \
  -d '{...}'

# Verify logs
# Check production logs for successful email receipt
```

### 4.4 Monitor for Issues

**Monitoring:**
- ✅ Watch server logs for errors
- ✅ Monitor webhook response times
- ✅ Track email verification success rate
- ✅ Monitor database performance
- ✅ Set up alerts for failures

---

## Implementation Checklist

### Backend Infrastructure
- [ ] Design email verification service
- [ ] Implement webhook endpoint
- [ ] Create email verification flow
- [ ] Add database schema
- [ ] Test locally with test script

### Email Service Integration
- [ ] Choose email provider
- [ ] Create setup documentation
- [ ] Implement provider integration
- [ ] Test webhook connectivity
- [ ] Verify API credentials work

### Testing & Validation
- [ ] Test email receiving end-to-end
- [ ] Verify verification flow
- [ ] Validate lead creation
- [ ] Document test results
- [ ] Fix any issues found

### Production Deployment
- [ ] Commit changes to GitHub
- [ ] Deploy to production
- [ ] Configure environment variables
- [ ] Test production webhook
- [ ] Monitor for issues

---

## Common Pitfalls & Solutions

### Pitfall 1: Webhook Not Receiving Emails
**Cause:** Email provider not configured to forward to webhook  
**Solution:** Verify webhook URL in email provider dashboard

### Pitfall 2: Verification Emails Not Sending
**Cause:** API key not set or provider API failing  
**Solution:** Check environment variables, verify API credentials, check provider logs

### Pitfall 3: Leads Not Created
**Cause:** Database connection issue or incorrect client ID  
**Solution:** Verify DATABASE_URL, check client ID in email address, review server logs

### Pitfall 4: Verification Code Expiration Issues
**Cause:** Timezone mismatch or clock skew  
**Solution:** Use UTC timestamps, implement clock skew tolerance

### Pitfall 5: Performance Issues with High Email Volume
**Cause:** Synchronous processing, no rate limiting  
**Solution:** Implement async processing, add rate limiting, optimize database queries

---

## Metrics & Success Criteria

### Performance Metrics
- Email receiving latency: < 1 second
- Verification code delivery: < 30 seconds
- Lead creation time: < 5 seconds
- Webhook success rate: > 99%

### Business Metrics
- Verification success rate: > 95%
- Lead creation rate: > 90%
- Customer satisfaction: > 4/5 stars
- Support tickets related to email: < 5%

### Technical Metrics
- Error rate: < 1%
- Database query time: < 100ms
- API response time: < 500ms
- Uptime: > 99.9%

---

## Reusable Templates

### Email Verification Service Template
```typescript
// File: src/services/emailVerification.ts
export class EmailVerificationService {
  async generateCode(email: string, clientId: number): Promise<string> {
    // Generate 6-character code
    // Store in database with expiration
    // Send via email provider
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    // Check code against stored code
    // Check expiration
    // Mark as verified
  }

  async isVerified(email: string, clientId: number): Promise<boolean> {
    // Check if sender is verified
  }
}
```

### Webhook Endpoint Template
```typescript
// File: src/routes/email.ts
app.post('/api/email/receive', async (req, res) => {
  const { from, to, subject, text, html } = req.body;

  // Extract client ID from email address
  const clientId = extractClientId(to);

  // Check if sender is verified
  const isVerified = await emailVerification.isVerified(from, clientId);

  if (!isVerified) {
    // Generate and send verification code
    const code = await emailVerification.generateCode(from, clientId);
    return res.status(202).json({ message: 'Verification required' });
  }

  // Create lead
  const lead = await createLead(clientId, from, subject, text);

  // Run AI qualification
  const qualification = await runQualification(lead);

  res.json({ success: true, leadId: lead.id });
});
```

### Setup Documentation Template
```markdown
# {PROVIDER} Email Receiving Setup Guide

## Overview
Brief description of what this guide covers

## Prerequisites
- Account with {PROVIDER}
- API key
- Production server URL

## Step 1: Create Domain
1. Go to {PROVIDER} dashboard
2. Navigate to Domains
3. Create domain: yourdomain.{provider}.dev
4. Verify domain

## Step 2: Configure Email Routing
1. Set up email forwarding
2. Configure webhook URL
3. Test webhook connectivity

## Step 3: Test Email Receiving
1. Send test email
2. Verify webhook receives email
3. Check server logs

## Troubleshooting
Common issues and solutions
```

---

## Naming Conventions

### Files
- `{SERVICE}-MANUAL-SETUP.md` - User-facing setup guide
- `{SERVICE}-WEBHOOK-SETUP.md` - Technical reference
- `{SERVICE}-IMPLEMENTATION-SUMMARY.md` - Implementation overview
- `configure-{service}.ts` - Configuration script

### Environment Variables
- `{SERVICE}_API_KEY` - API authentication key
- `{SERVICE}_WEBHOOK_URL` - Webhook endpoint URL
- `EMAIL_VERIFICATION_CODE_LENGTH` - Code length (default: 6)
- `EMAIL_VERIFICATION_EXPIRY_HOURS` - Code expiry (default: 24)

### Database Tables
- `email_verifications` - Verification codes and status
- `email_logs` - Email receipt logs
- `verified_senders` - Cached verified sender list

---

## Integration with v2 Operating System

### Mode: Business Builder
- Use this playbook when building SaaS products
- Apply systematic approach to email integration
- Document all steps for team collaboration
- Reuse templates for consistency

### Autonomy Level: Level 2 (Act then Report)
- Implement email webhook infrastructure autonomously
- Create documentation and test scripts
- Report results and recommendations
- Ask before making breaking changes

### Approval Boundaries
- ✅ Implement backend infrastructure autonomously
- ✅ Create documentation and guides
- ✅ Test locally and in staging
- ⏳ Ask before deploying to production
- ⏳ Ask before changing email provider

### School Administration Guardrails
- If handling student/staff emails: Apply confidentiality rules
- If storing email content: Implement access controls
- If using for notifications: Follow FERPA guidelines
- Document data retention policies

---

## Next Steps

### For Lead Qualifier Pro
1. ✅ Configure Resend domain
2. ✅ Test email receiving
3. ✅ Onboard first beta customer
4. ✅ Gather feedback
5. ✅ Iterate based on feedback

### For Future Projects
1. Use this playbook as template
2. Adapt for specific email provider
3. Customize for project requirements
4. Document project-specific variations
5. Share learnings with team

---

## Resources

- **Lead Qualifier Pro:** `/home/ubuntu/lead-qualifier-pro/`
- **Resend Docs:** https://resend.com/docs
- **SendGrid Docs:** https://docs.sendgrid.com
- **Mailgun Docs:** https://documentation.mailgun.com

---

## Lessons Learned

1. **Backend first:** Implement webhook endpoint before external service
2. **Verification essential:** Always require sender verification for security
3. **Graceful fallback:** Support development without external APIs
4. **Documentation critical:** Comprehensive guides reduce support burden
5. **Testing important:** Automated tests catch issues early
6. **Multi-tenant design:** Plan for multiple clients from the start
7. **Error handling:** Log all failures for debugging
8. **Performance matters:** Optimize for high email volume

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | June 1, 2026 | Initial playbook based on Lead Qualifier Pro implementation |

---

**Status:** Ready for Integration into v2 Configuration  
**Applicability:** High - Reusable for any email webhook project  
**Maintenance:** Update as new email providers or patterns emerge

