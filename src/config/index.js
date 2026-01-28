import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Environment configuration schema
 * In development mode, most fields have defaults to allow server to start
 */
const envSchema = z.object({
  // Server
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Twilio (required in production, defaults in dev)
  TWILIO_ACCOUNT_SID: isDev
    ? z.string().default('your_account_sid')
    : z.string().min(1, 'TWILIO_ACCOUNT_SID is required'),
  TWILIO_AUTH_TOKEN: isDev
    ? z.string().default('your_auth_token')
    : z.string().min(1, 'TWILIO_AUTH_TOKEN is required'),
  TWILIO_PHONE_NUMBER: isDev
    ? z.string().default('+1234567890')
    : z.string().min(1, 'TWILIO_PHONE_NUMBER is required'),

  // Vapi (required in production, defaults in dev)
  VAPI_API_KEY: isDev
    ? z.string().default('your_vapi_api_key')
    : z.string().min(1, 'VAPI_API_KEY is required'),
  VAPI_ASSISTANT_ID: isDev
    ? z.string().default('your_assistant_id')
    : z.string().min(1, 'VAPI_ASSISTANT_ID is required'),

  // Notifications (required in production, defaults in dev)
  OWNER_PHONE_NUMBER: isDev
    ? z.string().default('+1234567890')
    : z.string().min(1, 'OWNER_PHONE_NUMBER is required'),
  OWNER_EMAIL: isDev
    ? z.string().default('owner@example.com')
    : z.string().email('OWNER_EMAIL must be a valid email'),

  // Resend (required in production, defaults in dev)
  RESEND_API_KEY: isDev
    ? z.string().default('your_resend_api_key')
    : z.string().min(1, 'RESEND_API_KEY is required'),

  // Business
  COMPANY_NAME: z.string().default('ABC Plumbing'),

  // Google OAuth (optional - calendar features disabled without it)
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.string().default('http://localhost:3000/auth/google/callback'),

  // Database
  DATABASE_PATH: z.string().default('./data/calendar.db'),

  // Calendar Settings
  APPOINTMENT_DURATION_MINUTES: z.string().default('60'),
  BUSINESS_HOURS_START: z.string().default('09:00'),
  BUSINESS_HOURS_END: z.string().default('17:00'),
  BUSINESS_DAYS: z.string().default('1,2,3,4,5'),
  BUSINESS_TIMEZONE: z.string().default('America/New_York'),
});

/**
 * Validates and loads environment configuration
 * @returns {object} Validated configuration object
 */
function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    console.error('❌ Environment validation failed:');
    errors.forEach(err => console.error(`  - ${err}`));
    console.error('\nPlease check your .env file against .env.example');
    process.exit(1);
  }

  return {
    server: {
      port: parseInt(result.data.PORT, 10),
      nodeEnv: result.data.NODE_ENV,
      isDevelopment: result.data.NODE_ENV === 'development',
      isProduction: result.data.NODE_ENV === 'production',
    },
    twilio: {
      accountSid: result.data.TWILIO_ACCOUNT_SID,
      authToken: result.data.TWILIO_AUTH_TOKEN,
      phoneNumber: result.data.TWILIO_PHONE_NUMBER,
    },
    vapi: {
      apiKey: result.data.VAPI_API_KEY,
      assistantId: result.data.VAPI_ASSISTANT_ID,
    },
    notifications: {
      ownerPhone: result.data.OWNER_PHONE_NUMBER,
      ownerEmail: result.data.OWNER_EMAIL,
    },
    resend: {
      apiKey: result.data.RESEND_API_KEY,
    },
    business: {
      companyName: result.data.COMPANY_NAME,
    },
    google: {
      clientId: result.data.GOOGLE_CLIENT_ID,
      clientSecret: result.data.GOOGLE_CLIENT_SECRET,
      redirectUri: result.data.GOOGLE_REDIRECT_URI,
    },
    database: {
      path: result.data.DATABASE_PATH,
    },
    calendar: {
      appointmentDuration: parseInt(result.data.APPOINTMENT_DURATION_MINUTES, 10),
      businessHoursStart: result.data.BUSINESS_HOURS_START,
      businessHoursEnd: result.data.BUSINESS_HOURS_END,
      businessDays: result.data.BUSINESS_DAYS.split(',').map(d => parseInt(d, 10)),
      timezone: result.data.BUSINESS_TIMEZONE,
    },
  };
}

export const config = loadConfig();
export default config;
