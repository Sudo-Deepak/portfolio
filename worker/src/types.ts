export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  // vars
  RESUME_FILENAME: string;
  RESUME_OBJECT_KEY: string;
  ALLOWED_ORIGIN: string;
  SESSION_TTL_SECONDS?: string;
  // secrets
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD_HASH?: string;
  SESSION_SECRET?: string;
  FORMSUBMIT_CODE?: string; // FormSubmit email or activated hash for lead notifications (optional)
}

export interface SessionData {
  u: string; // username
  iat: number; // issued-at (epoch ms)
}
