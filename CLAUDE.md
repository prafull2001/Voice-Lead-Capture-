# CLAUDE.md - Project Context for Claude Code

## What This Project Is

A voice AI system that answers missed calls for service businesses, collects lead information, detects emergencies, and sends notifications to the business owner.

**Read PROJECT_SPEC.md for full requirements and architecture.**

---

## Quick Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run production
npm start

# Test health endpoint
curl http://localhost:3000/health
```

---

## Project Structure

```
src/
├── index.js              # Entry point - Express server setup
├── config/index.js       # Loads and validates env vars
├── routes/               # HTTP route definitions
├── controllers/          # Request handlers
├── services/             # Business logic (notifications, emergency detection)
├── prompts/              # Vapi assistant configuration
└── utils/                # Logger, validators
```

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/index.js` | Server entry, middleware, route mounting |
| `src/services/notification.service.js` | Sends SMS (Twilio) and email (Resend) |
| `src/services/emergency.service.js` | Detects emergency keywords in transcript |
| `src/controllers/vapi.controller.js` | Handles Vapi webhook events |
| `src/prompts/assistant.prompt.js` | Vapi assistant config and system prompt |

---

## Environment Variables Required

```
PORT, NODE_ENV
TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
VAPI_API_KEY, VAPI_ASSISTANT_ID
OWNER_PHONE_NUMBER, OWNER_EMAIL
RESEND_API_KEY
COMPANY_NAME
```

---

## Code Conventions

- **ES Modules**: Use `import`/`export`, not `require`
- **Async/Await**: All async code uses async/await
- **Error Handling**: Wrap async operations in try/catch
- **Logging**: Use `src/utils/logger.js` for all logs
- **Validation**: Use Zod schemas in `src/utils/validators.js`
- **Single Responsibility**: Each function does one thing
- **JSDoc**: Add comments to exported functions

---

## When Editing Code

1. **Adding a new route**: Create in `routes/`, add handler in `controllers/`, register in `routes/index.js`
2. **Adding business logic**: Create a service in `services/`
3. **Adding validation**: Add Zod schema in `utils/validators.js`
4. **Changing notifications**: Edit `services/notification.service.js`
5. **Changing AI behavior**: Edit `prompts/assistant.prompt.js`

---

## External Services

| Service | Docs | Purpose |
|---------|------|---------|
| Vapi | https://docs.vapi.ai | Voice AI platform |
| Twilio | https://www.twilio.com/docs | Phone + SMS |
| Resend | https://resend.com/docs | Email |

---

## Common Tasks

### Add a new emergency keyword
Edit `src/services/emergency.service.js`, add to `EMERGENCY_KEYWORDS` array.

### Change the greeting
Edit `src/prompts/assistant.prompt.js`, modify the `systemPrompt`.

### Add a new notification channel
1. Create new function in `notification.service.js`
2. Call it from `sendAllNotifications()`

### Add new extracted field from calls
1. Add to `extractedFields` in `prompts/assistant.prompt.js`
2. Update notification templates to include it

---

## Testing Tips

- Use ngrok to expose local server for webhook testing
- Vapi dashboard has a test call feature
- Check logs for webhook payload structure
- Test emergency detection with: "I have a gas leak"

---

## Don't Forget

- Never commit `.env` file
- Always validate webhook payloads
- Log errors with stack traces
- Keep the README updated
