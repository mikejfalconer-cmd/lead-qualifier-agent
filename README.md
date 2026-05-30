# Lead Qualifier Pro - AI Lead Qualification SaaS

Autonomous AI system for small businesses to qualify inbound leads, send personalized follow-ups, and manage client dashboards.

## Features

- **Email Intake** – Polls Gmail for inbound leads automatically
- **AI Qualification** – Scores leads using Claude 3.5 Sonnet with Elon's 5-step algorithm
- **Auto Follow-up** – Generates and sends personalized follow-up emails via Resend
- **Multi-Tenant** – Complete client isolation with private dashboards
- **Analytics** – Real-time lead statistics and conversion tracking
- **Billing** – Stripe integration for recurring subscriptions
- **API** – RESTful API for client integrations

## Tech Stack

- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **AI:** Claude 3.5 Sonnet (Anthropic)
- **Email:** Gmail IMAP + Resend
- **Payments:** Stripe
- **Hosting:** Manus (or any Node.js host)

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL database
- Gmail account with app password
- Anthropic API key
- Resend API key
- Stripe account

### Installation

```bash
# Clone and install
git clone <repo>
cd lead-qualifier-pro
pnpm install

# Copy environment template
cp .env.example .env

# Update .env with your credentials
nano .env

# Build
pnpm build

# Run
pnpm start
```

### Environment Variables

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/lead_qualifier_pro

# Gmail
GMAIL_ADDRESS=your-email@gmail.com
GMAIL_PASSWORD=your-app-password

# APIs
ANTHROPIC_API_KEY=sk-ant-xxxxx
RESEND_API_KEY=re_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx

# Server
PORT=3000
EMAIL_PROCESSOR_INTERVAL_MS=300000
```

## API Endpoints

### Authentication
All endpoints require `X-API-Key` header with client API key.

### Clients
- `GET /api/clients/me` – Get current client info

### Leads
- `GET /api/leads` – List all leads (supports filtering)
- `GET /api/leads/:leadId` – Get lead details
- `PATCH /api/leads/:leadId` – Update lead status

### Analytics
- `GET /api/analytics/summary` – Get lead statistics

## Development

```bash
# Watch mode
pnpm dev

# Type check
npx tsc --noEmit

# Build
pnpm build
```

## Deployment to Manus

1. Push code to GitHub
2. Create new Manus project
3. Connect GitHub repository
4. Add environment variables in Manus dashboard
5. Deploy

The system will:
- Run email processor as a Heartbeat job (every 5 minutes)
- Serve API on specified port
- Store all data in PostgreSQL

## Architecture

### Database Schema

**clients** – SaaS customers
- id, name, email, forwarding_email, subscription_status, stripe_customer_id

**leads** – Inbound leads
- id, client_id, sender_email, subject, body, score, qualification, status

**follow_ups** – Sent follow-up emails
- id, lead_id, email_body, sent_at, response_received

**email_logs** – All email activity
- id, client_id, type, from_email, to_email, status

### Processing Flow

1. **Email Processor** polls Gmail every 5 minutes
2. Extracts lead info (sender, subject, body)
3. Routes to correct client based on "To" address
4. **Lead Qualifier** analyzes with Claude AI
5. Returns score (0-100) and classification (Hot/Warm/Cold)
6. **Follow-up Generator** creates personalized response
7. **Email Delivery** sends via Resend
8. All activity logged for analytics

## Pricing Model

Suggested pricing:
- **Starter:** $299/month (100 leads/month)
- **Pro:** $499/month (500 leads/month)
- **Enterprise:** Custom pricing

## Support

For issues or questions, contact: mike@falconer.ai

## License

MIT
