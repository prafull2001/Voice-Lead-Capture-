# Voice AI Lead Capture

A voice AI system that answers missed calls for service businesses, collects lead information through natural conversation, detects emergencies, and notifies the business owner via SMS and email.

## Features

- Automated voice AI receptionist powered by Vapi
- Natural conversation to collect lead information
- Emergency detection for urgent situations
- SMS notifications via Twilio
- Email notifications via Resend
- Configurable for any service business

## Prerequisites

- Node.js 20+
- Vapi account and API key
- Twilio account with phone number
- Resend account and API key

## Quick Start

1. **Clone and install dependencies**
   ```bash
   cd voice-lead-capture
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Test the health endpoint**
   ```bash
   curl http://localhost:3000/health
   ```

## Configuration

Copy `.env.example` to `.env` and fill in your credentials:

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number |
| `VAPI_API_KEY` | Vapi API key |
| `VAPI_ASSISTANT_ID` | Vapi assistant ID |
| `OWNER_PHONE_NUMBER` | Phone to receive SMS notifications |
| `OWNER_EMAIL` | Email to receive notifications |
| `RESEND_API_KEY` | Resend API key |
| `COMPANY_NAME` | Your business name |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/webhooks/vapi/call-started` | POST | Called when a call begins |
| `/webhooks/vapi/call-ended` | POST | Called when a call ends |
| `/webhooks/vapi/function-call` | POST | Called for server-side functions |

## Project Structure

```
src/
├── index.js              # Entry point
├── config/               # Environment config
├── routes/               # HTTP routes
├── controllers/          # Request handlers
├── services/             # Business logic
├── prompts/              # Vapi assistant config
└── utils/                # Logger, validators
```

## Setting Up Vapi

1. Create a Vapi account at https://vapi.ai
2. Create a new assistant using the config in `src/prompts/assistant.prompt.js`
3. Link your Twilio phone number to Vapi
4. Set webhook URLs to point to your deployed server

## Deployment

### Using ngrok (Development)

```bash
ngrok http 3000
# Use the ngrok URL for Vapi webhooks
```

### Railway

```bash
railway init
railway up
```

### Render

Connect your GitHub repo and deploy with:
- Build command: `npm install`
- Start command: `npm start`

## Emergency Keywords

The system flags calls containing these keywords as emergencies:
- flood, flooding, flooded
- burst pipe, pipe burst
- no water, no hot water
- gas smell, gas leak
- sewage, sewage backup
- no heat, heating emergency
- overflow, overflowing
- emergency, urgent

Add more in `src/services/emergency.service.js`.

## License

ISC
