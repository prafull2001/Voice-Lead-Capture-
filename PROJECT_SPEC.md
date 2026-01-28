# Voice AI Lead Capture App - Project Specification

## Project Overview

Build a voice AI system that answers missed calls for service businesses (plumbers, HVAC, etc.), collects lead information through natural conversation, detects emergencies, and notifies the business owner via SMS/email.

---

## Core Requirements (MVP)

### Call Flow
1. **Greeting**: "Thanks for calling [Company Name], how can I help you today?"
2. **Collect Information**:
   - What the issue is (freeform)
   - Caller's name
   - Phone number or email
   - Service address
3. **Emergency Detection**: Flag calls containing keywords like "flooding", "no water", "gas smell", "burst pipe", "sewage", "no heat"
4. **End Call**: Confirm info and let them know someone will reach out
5. **Post-Call**: Send summary to owner via SMS and/or email

### Summary Format
```
📞 NEW LEAD

Name: [caller_name]
Phone: [phone_number]
Address: [service_address]
Issue: [issue_description]

🚨 Emergency: YES / NO
```

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js 20+ | Server runtime |
| Framework | Express.js | HTTP server for webhooks |
| Voice AI | Vapi.ai | Handles voice conversation |
| Phone | Twilio | Phone number + SMS |
| Email | Resend (or SendGrid) | Email notifications |
| Config | dotenv | Environment variables |
| Validation | Zod | Schema validation |

---

## Project Structure

```
voice-lead-capture/
├── src/
│   ├── index.js                 # App entry point
│   ├── config/
│   │   └── index.js             # Environment config loader
│   ├── routes/
│   │   ├── index.js             # Route aggregator
│   │   ├── vapi.routes.js       # Vapi webhook endpoints
│   │   └── health.routes.js     # Health check endpoint
│   ├── controllers/
│   │   └── vapi.controller.js   # Vapi webhook handlers
│   ├── services/
│   │   ├── notification.service.js  # SMS + Email sending
│   │   ├── emergency.service.js     # Emergency detection logic
│   │   └── summary.service.js       # Format call summaries
│   ├── prompts/
│   │   └── assistant.prompt.js  # Vapi assistant configuration
│   └── utils/
│       ├── logger.js            # Logging utility
│       └── validators.js        # Input validation schemas
├── .env.example                 # Example environment variables
├── .gitignore
├── package.json
└── README.md
```

---

## Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Vapi
VAPI_API_KEY=your_vapi_api_key
VAPI_ASSISTANT_ID=your_assistant_id

# Notifications
OWNER_PHONE_NUMBER=+1234567890
OWNER_EMAIL=owner@example.com

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# Business Info
COMPANY_NAME=ABC Plumbing
```

---

## API Endpoints

### POST /webhooks/vapi/call-started
Called when Vapi begins a call. Log the event.

### POST /webhooks/vapi/call-ended
Called when call ends. Receives transcript and extracted data. Triggers notification.

### POST /webhooks/vapi/function-call
Called if Vapi needs to execute a server-side function (optional for MVP).

### GET /health
Returns `{ status: "ok" }` for uptime monitoring.

---

## Vapi Assistant Configuration

The assistant should be configured with:

```javascript
{
  name: "Lead Capture Assistant",
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    systemPrompt: `You are a friendly receptionist for {{company_name}}.

Your job is to:
1. Greet the caller warmly
2. Ask what issue they're experiencing
3. Get their name
4. Get their callback number
5. Get their service address
6. Confirm the information and let them know someone will call back soon

Be conversational and natural. Don't sound robotic.
Keep responses brief - this is a phone call, not a chat.
If they mention an emergency (flooding, gas leak, no water, burst pipe),
acknowledge the urgency and assure them someone will call back ASAP.`
  },
  voice: {
    provider: "11labs",
    voiceId: "rachel" // or another natural-sounding voice
  },
  extractedFields: [
    { name: "caller_name", description: "The caller's full name" },
    { name: "phone_number", description: "Callback phone number" },
    { name: "email", description: "Email address if provided" },
    { name: "service_address", description: "Address where service is needed" },
    { name: "issue_description", description: "What problem they're experiencing" }
  ]
}
```

---

## Emergency Detection Logic

```javascript
const EMERGENCY_KEYWORDS = [
  'flood', 'flooding', 'flooded',
  'burst pipe', 'pipe burst',
  'no water', 'no hot water',
  'gas smell', 'gas leak', 'smell gas',
  'sewage', 'sewage backup',
  'no heat', 'heating emergency',
  'overflowing', 'overflow',
  'emergency'
];

function detectEmergency(transcript) {
  const lowerTranscript = transcript.toLowerCase();
  return EMERGENCY_KEYWORDS.some(keyword =>
    lowerTranscript.includes(keyword)
  );
}
```

---

## Notification Templates

### SMS Template
```
📞 NEW LEAD - {{company_name}}

Name: {{caller_name}}
Phone: {{phone_number}}
Address: {{service_address}}
Issue: {{issue_description}}

{{#if is_emergency}}
🚨 EMERGENCY - CALL BACK ASAP
{{else}}
Priority: Normal
{{/if}}

Received: {{timestamp}}
```

### Email Template
```
Subject: {{#if is_emergency}}🚨 EMERGENCY{{/if}} New Lead from {{caller_name}}

New lead received via voice AI:

CONTACT INFO
------------
Name: {{caller_name}}
Phone: {{phone_number}}
Email: {{email}}
Address: {{service_address}}

ISSUE
-----
{{issue_description}}

{{#if is_emergency}}
⚠️ This has been flagged as a potential EMERGENCY.
Keywords detected: {{emergency_keywords}}
Please call back immediately.
{{/if}}

---
Call received: {{timestamp}}
Call duration: {{duration}} seconds
```

---

## Development Workflow

### Phase 1: Project Setup
1. Initialize Node.js project
2. Install dependencies
3. Set up folder structure
4. Create config loader
5. Set up Express server with health check

### Phase 2: Vapi Integration
1. Create Vapi account and get API key
2. Configure assistant with system prompt
3. Set up webhook endpoints
4. Test with Vapi's dashboard

### Phase 3: Notification System
1. Implement SMS sending via Twilio
2. Implement email sending via Resend
3. Create notification service that sends both
4. Test notifications

### Phase 4: Connect Everything
1. Link Twilio number to Vapi
2. Configure Vapi webhooks to point to your server
3. End-to-end test

### Phase 5: Deploy
1. Deploy to Railway/Render
2. Update webhook URLs
3. Final testing

---

## Code Style Guidelines

- Use ES Modules (`import`/`export`)
- Use async/await for all async operations
- Add JSDoc comments to all functions
- Use descriptive variable names
- Keep functions small and single-purpose
- Handle all errors gracefully with try/catch
- Log important events for debugging

---

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "dotenv": "^16.3.1",
    "twilio": "^4.19.0",
    "resend": "^2.0.0",
    "zod": "^3.22.4",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## Testing Checklist

- [ ] Health endpoint returns 200
- [ ] Vapi webhook receives call-started event
- [ ] Vapi webhook receives call-ended event with data
- [ ] Emergency detection correctly flags keywords
- [ ] SMS sends successfully
- [ ] Email sends successfully
- [ ] End-to-end: Call → Conversation → Notification

---

## Notes for Claude Code

When working on this project:

1. **Start with the skeleton**: Create the folder structure and empty files first
2. **Build incrementally**: Get each piece working before moving to the next
3. **Use environment variables**: Never hardcode secrets
4. **Add logging**: Use the logger utility for all important events
5. **Validate inputs**: Use Zod schemas for webhook payloads
6. **Handle errors**: Every async function should have error handling
7. **Keep it simple**: This is an MVP - don't over-engineer

If you need to make changes, the modular structure means you can edit one service without affecting others.
