# Lead Qualifier Pro - SaaS Architecture

## Overview
Autonomous AI lead qualification and follow-up system for small businesses. Multi-tenant SaaS with email integration, lead scoring, and billing.

## Core Features
1. **Email Processor** – Polls Gmail for inbound leads
2. **AI Qualification** – Scores leads (Hot/Warm/Cold) using Elon's 5-step algorithm
3. **Auto Follow-up** – Sends personalized emails via Resend
4. **Client Dashboard** – Private views for each client
5. **Admin Panel** – For Mike to manage clients and monitor system
6. **Billing** – Stripe integration for recurring subscriptions

## Architecture

### Database Schema (PostgreSQL)
```
clients
  - id (PK)
  - name
  - email
  - forwarding_email (unique)
  - subscription_status
  - stripe_customer_id
  - created_at

leads
  - id (PK)
  - client_id (FK)
  - sender_email
  - subject
  - body
  - score (0-100)
  - qualification (Hot/Warm/Cold)
  - status (new/contacted/converted/lost)
  - created_at

follow_ups
  - id (PK)
  - lead_id (FK)
  - sent_at
  - response_received
  - response_body

email_logs
  - id (PK)
  - client_id (FK)
  - type (inbound/outbound)
  - from_email
  - to_email
  - subject
  - timestamp
```

### Services

#### 1. Email Processor (Heartbeat Job)
- Runs every 5 minutes
- Connects to Gmail IMAP
- Extracts lead info (sender, subject, body)
- Routes to correct client based on "To" address
- Triggers lead qualification

#### 2. Lead Qualifier (AI Service)
- Analyzes lead text with Claude/GPT
- Applies 5-step algorithm:
  1. Problem identification
  2. Solution fit assessment
  3. Budget indicators
  4. Timeline evaluation
  5. Decision-maker identification
- Returns score (0-100) and classification

#### 3. Follow-up Generator (AI Service)
- Generates personalized follow-up email
- Uses client branding
- Tailored to lead profile
- Sends via Resend API

#### 4. Dashboard API
- Client authentication
- Lead filtering/search
- Analytics endpoints
- Subscription management

### Frontend
- React dashboard for clients
- Admin panel for Mike
- Real-time lead updates
- Analytics and reporting

## Deployment
- Manus infrastructure (hosting + database)
- Heartbeat jobs for background processing
- Resend for email delivery
- Stripe for billing

## Security
- Client data isolation (client_id filtering)
- API authentication
- Encrypted credentials
- Audit logging

## Scalability
- Horizontal scaling via Manus
- Database indexing on client_id
- Caching for frequently accessed data
- Rate limiting on API endpoints
