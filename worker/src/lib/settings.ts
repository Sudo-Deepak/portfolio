import type { Env } from '../types';

// Mutable config lives in KV so it can be changed from the admin panel without a
// redeploy. The wrangler.toml `RESUME_FILENAME` var stays as the initial default.
const RESUME_NAME_KEY = 'config:resume_filename';

// Sanitize a user-supplied download name so it is safe to place inside a
// Content-Disposition header (no CR/LF, quotes, path separators or angle
// brackets, no control characters) and always ends in .pdf.
export function sanitizeResumeFilename(raw: unknown): string | null {
  const stripped = String(raw ?? '')
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      if (code < 0x20 || code === 0x7f) return false; // control chars
      return '\\/"<>'.indexOf(ch) === -1; // header-breaking chars
    })
    .join('')
    .trim()
    .slice(0, 120)
    .trim();
  if (!stripped) return null;
  return /\.pdf$/i.test(stripped) ? stripped : stripped + '.pdf';
}

// Current download filename: KV override if set, else the wrangler.toml default.
export async function getResumeFilename(env: Env): Promise<string> {
  try {
    const v = await env.SESSIONS.get(RESUME_NAME_KEY);
    if (v) return v;
  } catch {
    /* fall through to the configured default */
  }
  return env.RESUME_FILENAME || 'resume.pdf';
}

// Persist a new download filename. Returns the sanitized value, or null if the
// input was empty/invalid after sanitizing.
export async function setResumeFilename(env: Env, raw: unknown): Promise<string | null> {
  const name = sanitizeResumeFilename(raw);
  if (!name) return null;
  await env.SESSIONS.put(RESUME_NAME_KEY, name);
  return name;
}

// Timestamp (epoch ms) of the last time leads were marked "read" in the admin UI.
// Lives in KV so the unread badge survives redeploys. 0 = nothing seen yet.
const LEADS_SEEN_KEY = 'config:leads_seen_ts';

export async function getLeadsSeenTs(env: Env): Promise<number> {
  try {
    const v = await env.SESSIONS.get(LEADS_SEEN_KEY);
    return v ? Number(v) || 0 : 0;
  } catch {
    return 0;
  }
}

export async function setLeadsSeenTs(env: Env, ts: number): Promise<void> {
  await env.SESSIONS.put(LEADS_SEEN_KEY, String(ts));
}
