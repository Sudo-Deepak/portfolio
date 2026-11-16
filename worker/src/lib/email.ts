import type { Env } from '../types';

export interface LeadEmail {
  name: string;
  email: string;
  message: string;
  channel: string | null;
  country: string | null;
  city: string | null;
  region: string | null;
}

// Lead notification via FormSubmit, called SERVER-SIDE from the Worker (never the
// browser) over HTTPS/TLS. Security posture:
//   - the browser never talks to FormSubmit; it only POSTs to our same-origin
//     /contact endpoint (origin-checked, honeypot + rate-limited);
//   - the FormSubmit identifier lives in the FORMSUBMIT_CODE secret, so it is never
//     exposed in the client bundle or the repo;
//   - the outbound call is HTTPS with an 8s timeout so a slow upstream can't hang
//     the request.
// Best-effort: returns true only on a 2xx + {success:"true"} response; never throws —
// the lead is already durably stored in D1 before this runs.
export async function sendLeadEmail(env: Env, lead: LeadEmail): Promise<boolean> {
  const code = env.FORMSUBMIT_CODE;
  if (!code) return false;

  const loc = [lead.city, lead.region, lead.country].filter(Boolean).join(', ') || 'Unknown';
  const source = lead.channel || 'Direct';

  // FormSubmit AJAX payload. `email` becomes the reply-to; `_*` are FormSubmit
  // directives (subject/layout/no-captcha).
  const payload = {
    name: lead.name,
    email: lead.email,
    _replyto: lead.email,
    message: lead.message,
    source,
    location: loc,
    _subject: ('New portfolio lead: ' + lead.name).slice(0, 120),
    _template: 'table',
    _captcha: 'false',
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(code), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as { success?: unknown } | null;
    // FormSubmit returns { success: "true", ... } on a delivered submission.
    return !!data && (data.success === true || String(data.success) === 'true');
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
