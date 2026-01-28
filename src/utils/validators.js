import { z } from 'zod';

/**
 * Schema for Vapi call-started webhook payload
 */
export const callStartedSchema = z.object({
  type: z.literal('call-started'),
  call: z.object({
    id: z.string(),
    orgId: z.string().optional(),
    createdAt: z.string().optional(),
    startedAt: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    phoneNumber: z.object({
      number: z.string().optional(),
    }).optional(),
    customer: z.object({
      number: z.string().optional(),
    }).optional(),
  }),
});

/**
 * Schema for extracted lead data from Vapi
 */
export const extractedDataSchema = z.object({
  caller_name: z.string().optional(),
  phone_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  service_address: z.string().optional(),
  issue_description: z.string().optional(),
});

/**
 * Schema for Vapi call-ended webhook payload
 */
export const callEndedSchema = z.object({
  type: z.literal('call-ended'),
  call: z.object({
    id: z.string(),
    orgId: z.string().optional(),
    createdAt: z.string().optional(),
    startedAt: z.string().optional(),
    endedAt: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    endedReason: z.string().optional(),
    transcript: z.string().optional(),
    summary: z.string().optional(),
    messages: z.array(z.any()).optional(),
    analysis: z.object({
      summary: z.string().optional(),
      structuredData: extractedDataSchema.optional(),
    }).optional(),
    phoneNumber: z.object({
      number: z.string().optional(),
    }).optional(),
    customer: z.object({
      number: z.string().optional(),
    }).optional(),
  }),
});

/**
 * Schema for Vapi function-call webhook payload
 */
export const functionCallSchema = z.object({
  type: z.literal('function-call'),
  functionCall: z.object({
    name: z.string(),
    parameters: z.record(z.any()).optional(),
  }),
  call: z.object({
    id: z.string(),
  }),
});

/**
 * Validates a Vapi webhook payload
 * @param {string} eventType - The type of event
 * @param {object} payload - The webhook payload
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
export function validateWebhook(eventType, payload) {
  try {
    let schema;

    switch (eventType) {
      case 'call-started':
        schema = callStartedSchema;
        break;
      case 'call-ended':
        schema = callEndedSchema;
        break;
      case 'function-call':
        schema = functionCallSchema;
        break;
      default:
        return { success: true, data: payload };
    }

    const result = schema.safeParse(payload);

    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: errors.join(', ') };
    }

    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Lead data schema for notification
 */
export const leadDataSchema = z.object({
  callerName: z.string().default('Unknown'),
  phoneNumber: z.string().default('Not provided'),
  email: z.string().optional(),
  serviceAddress: z.string().default('Not provided'),
  issueDescription: z.string().default('Not provided'),
  isEmergency: z.boolean().default(false),
  emergencyKeywords: z.array(z.string()).optional(),
  callId: z.string(),
  timestamp: z.string(),
  duration: z.number().optional(),
});

export default {
  callStartedSchema,
  callEndedSchema,
  functionCallSchema,
  extractedDataSchema,
  leadDataSchema,
  validateWebhook,
};
