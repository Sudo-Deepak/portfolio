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

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string);
}

// Send a lead notification via Resend. Best-effort: returns true on a 2xx response,
// false on any failure (missing key, network error, non-2xx). Never throws — the
// lead is already durably stored in D1 before this is called.
export async function sendLeadEmail(env: Env, lead: LeadEmail): Promise<boolean> {
  if (!env.RESEND_API_KEY) return false;
  const to = env.LEAD_NOTIFY_EMAIL;
  const from = env.LEAD_FROM_EMAIL || 'onboarding@resend.dev';
  if (!to) return false;

  const loc = [lead.city, lead.region, lead.country].filter(Boolean).join(', ') || 'Unknown';
  const source = lead.channel || 'Direct';

  const text =
    `New portfolio lead\n\n` +
    `Name: ${lead.name}\n` +
    `Email: ${lead.email}\n` +
    `Source: ${source}\n` +
    `Location: ${loc}\n\n` +
    `Message:\n${lead.message}\n`;

  const html =
    `<h2>New portfolio lead</h2>` +
    `<p><strong>Name:</strong> ${esc(lead.name)}<br>` +
    `<strong>Email:</strong> <a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a><br>` +
    `<strong>Source:</strong> ${esc(source)}<br>` +
    `<strong>Location:</strong> ${esc(loc)}</p>` +
    `<p><strong>Message:</strong></p>` +
    `<p style="white-space:pre-wrap">${esc(lead.message)}</p>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: lead.email,
        subject: `New lead: ${lead.name}`.slice(0, 120),
        text,
        html,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
