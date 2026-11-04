// Tiny, dependency-free User-Agent classification (kept well under the CPU budget).

export function isBot(ua: string): boolean {
  if (!ua) return true;
  return /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|pingdom|monitor|curl|wget|python-requests|axios|go-http|node-fetch/i.test(
    ua,
  );
}

export function parseDevice(ua: string): string {
  if (!ua) return 'unknown';
  if (/tablet|ipad|playbook|silk|android(?!.*mobile)/i.test(ua)) return 'tablet';
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function parseBrowser(ua: string): string {
  if (!ua) return 'unknown';
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/chrome|crios|chromium/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && /version\//i.test(ua)) return 'Safari';
  return 'Other';
}

export function parseOS(ua: string): string {
  if (!ua) return 'unknown';
  if (/windows nt/i.test(ua)) return 'Windows';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/android/i.test(ua)) return 'Android';
  if (/mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}
