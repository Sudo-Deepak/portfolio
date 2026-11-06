// Turns a landing-page query string into traffic attribution:
//   - source/audience come from URL tags you add to the links you share, e.g.
//       https://.../portfolio?ref=linkedin&aud=recruiter
//   - when there's no tag, the referrer host is bucketed into a friendly channel.
// This keeps attribution reliable even when apps (LinkedIn/Instagram) strip the
// referrer, while staying cookie-free and private.

export interface Tags {
  source: string | null;
  audience: string | null;
}

export function parseTags(qs: unknown): Tags {
  if (typeof qs !== 'string' || !qs) return { source: null, audience: null };
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(qs.charAt(0) === '?' ? qs.slice(1) : qs);
  } catch {
    return { source: null, audience: null };
  }
  const pick = (keys: string[]): string | null => {
    for (const k of keys) {
      const v = params.get(k);
      if (v) return v.slice(0, 40).toLowerCase();
    }
    return null;
  };
  return {
    source: pick(['ref', 'utm_source', 'src', 'source']),
    audience: pick(['aud', 'audience', 'utm_campaign']),
  };
}

// Friendly labels for common explicit ?ref values.
const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  resume: 'Resume',
  cv: 'Resume',
  github: 'GitHub',
  youtube: 'YouTube',
  yt: 'YouTube',
  instagram: 'Instagram',
  insta: 'Instagram',
  email: 'Email',
  mail: 'Email',
  newsletter: 'Email',
  twitter: 'Twitter/X',
  x: 'Twitter/X',
  reddit: 'Reddit',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  naukri: 'Naukri',
  indeed: 'Indeed',
  google: 'Search',
  search: 'Search',
};

// Referrer-host → channel buckets, used only when there's no explicit tag.
const HOST_CHANNELS: Array<[RegExp, string]> = [
  [/linkedin\.|lnkd\.in/, 'LinkedIn'],
  [/github\./, 'GitHub'],
  [/youtube\.|youtu\.be/, 'YouTube'],
  [/instagram\./, 'Instagram'],
  [/t\.co$|twitter\.|x\.com/, 'Twitter/X'],
  [/reddit\./, 'Reddit'],
  [/facebook\.|fb\.me/, 'Facebook'],
  [/google\.|bing\.|duckduckgo\.|yahoo\.|ecosia\./, 'Search'],
  [/mail\.|gmail\.|outlook\.|proton\./, 'Email'],
  [/naukri\./, 'Naukri'],
  [/indeed\./, 'Indeed'],
];

function titleize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Best-available channel: an explicit tag wins; else bucket the referrer host;
// else it's direct/unknown.
export function classifyChannel(source: string | null, referrerHost: string | null): string {
  if (source) return SOURCE_LABELS[source] || titleize(source);
  if (referrerHost) {
    for (const [re, label] of HOST_CHANNELS) if (re.test(referrerHost)) return label;
    return referrerHost; // show the raw host for anything we don't map
  }
  return 'Direct';
}
