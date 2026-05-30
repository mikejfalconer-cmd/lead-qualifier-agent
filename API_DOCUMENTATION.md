# Lead Qualifier Pro - API Documentation

## Overview

Lead Qualifier Pro is an AI-powered SaaS platform that automatically qualifies incoming leads using Anthropic Claude and sends personalized follow-up emails via Resend.

**Base URL:** `https://lead-qualifier-agent.vercel.app`

## Authentication

All API endpoints (except `/health`) require an API key passed in the `X-API-Key` header.

```bash
curl -H "X-API-Key: your_api_key_here" https://lead-qualifier-agent.vercel.app/api/leads
```

## Health Check

### GET /health

Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-05-30T04:30:57.000Z",
  "environment": "production"
}
```

---

## Client Endpoints

### GET /api/clients/me

Get the authenticated client's profile.

**Headers:**
- `X-API-Key: required`

**Response:**
```json
{
  "id": 1,
  "name": "Acme Corp",
  "email": "sales@acme.com",
  "forwardingEmail": "leads@acme.com",
  "subscriptionStatus": "active",
  "createdAt": "2026-05-30T04:30:57.000Z"
}
```

---

## Lead Endpoints

### GET /api/leads

Get all leads for the authenticated client.

**Headers:**
- `X-API-Key: required`

**Query Parameters:**
- `qualification` (optional): Filter by qualification level (`hot`, `warm`, `cold`)
- `status` (optional): Filter by status (`new`, `contacted`, `converted`, `lost`)

**Example:**
```bash
curl -H "X-API-Key: your_api_key" \
  "https://lead-qualifier-agent.vercel.app/api/leads?qualification=hot"
```

**Response:**
```json
[
  {
    "id": 1,
    "clientId": 1,
    "senderEmail": "prospect@company.com",
    "senderName": "John Smith",
    "subject": "Interested in your services",
    "body": "Hi, we are looking for a solution...",
    "score": 85,
    "qualification": "hot",
    "status": "new",
    "notes": "Problem: Lead generation automation\nFit: Perfect match",
    "createdAt": "2026-05-30T04:30:57.000Z",
    "updatedAt": "2026-05-30T04:30:57.000Z"
  }
]
```

### GET /api/leads/:leadId

Get a specific lead by ID.

**Headers:**
- `X-API-Key: required`

**Response:**
```json
{
  "id": 1,
  "clientId": 1,
  "senderEmail": "prospect@company.com",
  "senderName": "John Smith",
  "subject": "Interested in your services",
  "body": "Hi, we are looking for a solution...",
  "score": 85,
  "qualification": "hot",
  "status": "new",
  "notes": "Problem: Lead generation automation\nFit: Perfect match",
  "createdAt": "2026-05-30T04:30:57.000Z",
  "updatedAt": "2026-05-30T04:30:57.000Z",
  "followUps": [
    {
      "id": 1,
      "leadId": 1,
      "clientId": 1,
      "emailBody": "Hi John, Thank you for your interest...",
      "sentAt": "2026-05-30T04:30:57.000Z",
      "responseReceived": false,
      "createdAt": "2026-05-30T04:30:57.000Z"
    }
  ]
}
```

### PATCH /api/leads/:leadId

Update a lead's status, notes, qualification, or score.

**Headers:**
- `X-API-Key: required`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "status": "contacted",
  "notes": "Called prospect, very interested",
  "qualification": "hot",
  "score": 90
}
```

**Response:**
```json
{
  "id": 1,
  "clientId": 1,
  "senderEmail": "prospect@company.com",
  "senderName": "John Smith",
  "subject": "Interested in your services",
  "body": "Hi, we are looking for a solution...",
  "score": 90,
  "qualification": "hot",
  "status": "contacted",
  "notes": "Called prospect, very interested",
  "createdAt": "2026-05-30T04:30:57.000Z",
  "updatedAt": "2026-05-30T04:30:57.000Z"
}
```

---

## Follow-up Endpoints

### GET /api/leads/:leadId/follow-ups

Get all follow-ups for a specific lead.

**Headers:**
- `X-API-Key: required`

**Response:**
```json
[
  {
    "id": 1,
    "leadId": 1,
    "clientId": 1,
    "emailBody": "Hi John, Thank you for your interest...",
    "sentAt": "2026-05-30T04:30:57.000Z",
    "responseReceived": false,
    "responseBody": null,
    "responseReceivedAt": null,
    "createdAt": "2026-05-30T04:30:57.000Z"
  }
]
```

### POST /api/leads/:leadId/follow-up

Send a follow-up email for a lead.

**Headers:**
- `X-API-Key: required`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "customMessage": "Optional custom message. If not provided, AI will generate one."
}
```

**Response:**
```json
{
  "success": true,
  "followUp": {
    "id": 2,
    "leadId": 1,
    "clientId": 1,
    "emailBody": "Hi John, Thank you for your interest...",
    "sentAt": "2026-05-30T04:30:57.000Z",
    "responseReceived": false,
    "createdAt": "2026-05-30T04:30:57.000Z"
  },
  "messageId": "msg_abc123xyz"
}
```

### PATCH /api/follow-ups/:followUpId/response

Mark a follow-up as responded.

**Headers:**
- `X-API-Key: required`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "responseBody": "Thanks for reaching out! We're very interested in learning more."
}
```

**Response:**
```json
{
  "id": 1,
  "leadId": 1,
  "clientId": 1,
  "emailBody": "Hi John, Thank you for your interest...",
  "sentAt": "2026-05-30T04:30:57.000Z",
  "responseReceived": true,
  "responseBody": "Thanks for reaching out! We're very interested in learning more.",
  "responseReceivedAt": "2026-05-30T04:35:00.000Z",
  "createdAt": "2026-05-30T04:30:57.000Z"
}
```

---

## Analytics Endpoints

### GET /api/analytics/summary

Get lead statistics for the authenticated client.

**Headers:**
- `X-API-Key: required`

**Response:**
```json
{
  "totalLeads": 42,
  "hotLeads": 12,
  "warmLeads": 18,
  "coldLeads": 12,
  "convertedLeads": 5,
  "contactedLeads": 28,
  "lostLeads": 3,
  "averageScore": 68
}
```

### GET /api/analytics/email-logs

Get email logs for the authenticated client.

**Headers:**
- `X-API-Key: required`

**Query Parameters:**
- `type` (optional): Filter by type (`inbound`, `outbound`)

**Response:**
```json
[
  {
    "id": 1,
    "clientId": 1,
    "type": "outbound",
    "fromEmail": "sales@acme.com",
    "toEmail": "prospect@company.com",
    "subject": "Re: Interested in your services",
    "messageId": "msg_abc123xyz",
    "status": "sent",
    "errorMessage": null,
    "timestamp": "2026-05-30T04:30:57.000Z"
  }
]
```

---

## Lead Qualification Scoring

The AI qualification system uses Elon Musk's 5-step algorithm:

1. **Question the Requirement** - Is this a real opportunity?
2. **Delete the Requirement** - Is it essential?
3. **Simplify and Optimize** - Can we improve it?
4. **Accelerate Cycle Time** - Can we speed it up?
5. **Automate** - Can we automate it?

### Qualification Levels

- **🔥 Hot (80-100):** Clear buying intent, specific needs, decision-maker present
- **🌤️ Warm (50-79):** Interested but needs nurturing, potential fit
- **❄️ Cold (0-49):** Low intent, generic inquiry, not a good fit

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

### Common Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid API key
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Rate Limiting

Currently, there are no rate limits. However, we recommend:
- Maximum 100 requests per minute
- Batch operations when possible
- Use appropriate query filters to reduce data transfer

---

## Webhook Integration (Coming Soon)

Future versions will support webhooks for:
- New lead received
- Lead qualification complete
- Follow-up sent
- Response received

---

## Code Examples

### Python

```python
import requests

API_KEY = "your_api_key_here"
BASE_URL = "https://lead-qualifier-agent.vercel.app"

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# Get all hot leads
response = requests.get(
    f"{BASE_URL}/api/leads?qualification=hot",
    headers=headers
)
leads = response.json()

# Update a lead
response = requests.patch(
    f"{BASE_URL}/api/leads/1",
    headers=headers,
    json={
        "status": "contacted",
        "notes": "Called prospect"
    }
)
```

### JavaScript

```javascript
const API_KEY = "your_api_key_here";
const BASE_URL = "https://lead-qualifier-agent.vercel.app";

const headers = {
  "X-API-Key": API_KEY,
  "Content-Type": "application/json"
};

// Get all hot leads
const response = await fetch(
  `${BASE_URL}/api/leads?qualification=hot`,
  { headers }
);
const leads = await response.json();

// Send a follow-up
const followUpResponse = await fetch(
  `${BASE_URL}/api/leads/1/follow-up`,
  {
    method: "POST",
    headers,
    body: JSON.stringify({
      customMessage: "Hi John, great to connect!"
    })
  }
);
```

### cURL

```bash
# Get client info
curl -H "X-API-Key: your_api_key_here" \
  https://lead-qualifier-agent.vercel.app/api/clients/me

# Get all leads
curl -H "X-API-Key: your_api_key_here" \
  https://lead-qualifier-agent.vercel.app/api/leads

# Send a follow-up
curl -X POST \
  -H "X-API-Key: your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{"customMessage": "Hi John!"}' \
  https://lead-qualifier-agent.vercel.app/api/leads/1/follow-up
```

---

## Support

For issues or questions, please contact: support@leadqualifierpro.com

---

**Last Updated:** May 30, 2026
