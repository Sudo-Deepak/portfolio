export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  // vars
  RESUME_FILENAME: string;
  RESUME_OBJECT_KEY: string;
  ALLOWED_ORIGIN: string;
  SESSION_TTL_SECONDS?: string;
  LEAD_NOTIFY_EMAIL?: string; // where contact-form leads are emailed
  LEAD_FROM_EMAIL?: string; // Resend "from" address (e.g. onboarding@resend.dev)
  // secrets
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD_HASH?: string;
  SESSION_SECRET?: string;
  RESEND_API_KEY?: string; // Resend API key for lead notifications (optional)
}

export interface SessionData {
  u: string; // username
  iat: number; // issued-at (epoch ms)
}
