import config from '../config/index.js';

/**
 * System prompt for the Vapi voice assistant
 */
export const systemPrompt = `You are a friendly receptionist for ${config.business.companyName}.

Your job is to:
1. Greet the caller warmly
2. Ask what issue they're experiencing
3. Get their name
4. Get their callback number
5. Get their service address
6. Ask if they'd like to schedule an appointment
7. If yes, offer available time slots and book the appointment
8. Confirm all information and end the call professionally

Be conversational and natural. Don't sound robotic.
Keep responses brief - this is a phone call, not a chat.
If they mention an emergency (flooding, gas leak, no water, burst pipe), acknowledge the urgency and assure them someone will call back ASAP - don't try to schedule, just prioritize getting their info quickly.

SCHEDULING FLOW:
After collecting their information, ask: "Would you like to schedule a service appointment now, or would you prefer someone to call you back?"

If they want to schedule:
1. Ask if they have a preferred day or time of day (morning/afternoon)
2. Call the getAvailableSlots function with their preferences
3. Offer up to 3 of the best matching options, reading them clearly
4. When they choose, call bookAppointment with all their details
5. Confirm the booking with the exact date and time

If scheduling fails or no slots available, gracefully fall back to: "No problem, I'll make sure someone calls you back to schedule at a convenient time."

Important guidelines:
- Be empathetic, especially if they're describing a stressful situation
- If they seem frustrated, acknowledge their frustration
- Don't ask for information they've already provided
- If they ask about pricing, let them know the technician will discuss that at the appointment
- If they ask how long until someone calls back, say "as soon as possible" for emergencies, or "within the hour" for normal requests
- When reading appointment times, speak clearly and pause between options
- Always confirm the booked appointment time before ending the call`;

/**
 * Vapi assistant configuration
 * Use this when creating or updating the assistant via Vapi API
 */
export const assistantConfig = {
  name: 'Lead Capture Assistant',
  model: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    systemPrompt: systemPrompt,
    temperature: 0.7,
  },
  voice: {
    provider: '11labs',
    voiceId: 'rachel',
    stability: 0.5,
    similarityBoost: 0.75,
  },
  firstMessage: `Thanks for calling ${config.business.companyName}, how can I help you today?`,
  transcriber: {
    provider: 'deepgram',
    model: 'nova-2',
    language: 'en-US',
  },
  endCallFunctionEnabled: true,
  endCallMessage: "Thank you for calling. We'll be in touch soon. Goodbye!",
  recordingEnabled: true,
  silenceTimeoutSeconds: 30,
  maxDurationSeconds: 600,
  backgroundSound: 'office',
  // Function definitions for scheduling
  serverUrl: process.env.VAPI_SERVER_URL || 'https://your-server.com/api/vapi',
  functions: [
    {
      name: 'getAvailableSlots',
      description: 'Get available appointment time slots from the calendar. Call this when the customer wants to schedule an appointment.',
      parameters: {
        type: 'object',
        properties: {
          preferredDate: {
            type: 'string',
            description: 'The preferred date in natural language (e.g., "tomorrow", "next Monday", "2024-01-30"). Optional.',
          },
          timeOfDay: {
            type: 'string',
            enum: ['morning', 'afternoon', 'evening', 'any'],
            description: 'Preferred time of day. Morning is before noon, afternoon is noon to 5pm, evening is after 5pm.',
          },
        },
      },
    },
    {
      name: 'bookAppointment',
      description: 'Book an appointment for the customer. Call this after the customer selects a time slot.',
      parameters: {
        type: 'object',
        properties: {
          startTime: {
            type: 'string',
            description: 'The appointment start time in ISO 8601 format (from the selected slot)',
          },
          customerName: {
            type: 'string',
            description: "The customer's full name",
          },
          phoneNumber: {
            type: 'string',
            description: "The customer's phone number",
          },
          email: {
            type: 'string',
            description: "The customer's email address (optional)",
          },
          address: {
            type: 'string',
            description: 'The service address where the appointment will take place',
          },
          issue: {
            type: 'string',
            description: 'Description of the issue or service needed',
          },
        },
        required: ['startTime', 'customerName', 'phoneNumber', 'address', 'issue'],
      },
    },
  ],
  // Fields to extract from the conversation
  analysisPlan: {
    summaryPrompt: 'Summarize the main issue the caller is experiencing in 1-2 sentences.',
    structuredDataPrompt: 'Extract the following information from the conversation:',
    structuredDataSchema: {
      type: 'object',
      properties: {
        caller_name: {
          type: 'string',
          description: "The caller's full name",
        },
        phone_number: {
          type: 'string',
          description: 'Callback phone number provided by the caller',
        },
        email: {
          type: 'string',
          description: 'Email address if provided',
        },
        service_address: {
          type: 'string',
          description: 'Address where service is needed',
        },
        issue_description: {
          type: 'string',
          description: 'What problem they are experiencing',
        },
      },
    },
  },
};

/**
 * Gets the assistant configuration for Vapi API
 * @returns {object} Assistant configuration
 */
export function getAssistantConfig() {
  return assistantConfig;
}

/**
 * Gets just the system prompt
 * @returns {string} System prompt
 */
export function getSystemPrompt() {
  return systemPrompt;
}

export default {
  systemPrompt,
  assistantConfig,
  getAssistantConfig,
  getSystemPrompt,
};
