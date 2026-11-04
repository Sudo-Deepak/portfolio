import type { Env, SessionData } from '../types';

const encoder = new TextEncoder();
export const SESSION_COOKIE = 'pf_sid';

function bytesToHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : '0' + hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16) || 0;
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number, bits: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, bits);
  return new Uint8Array(derived);
}

// stored format: pbkdf2$<iterations>$<saltHex>$<hashHex>
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  if (!iterations) return false;
  const salt = hexToBytes(parts[2]);
  const expected = hexToBytes(parts[3]);
  const actual = await pbkdf2(password, salt, iterations, expected.length * 8);
  return constantTimeEqual(actual, expected);
}

export async function verifyCredentials(env: Env, username: string, password: string): Promise<boolean> {
  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD_HASH) return false;
  // Always derive the hash to keep timing roughly uniform regardless of username.
  const passOk = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
  const userOk = constantTimeEqual(encoder.encode(username), encoder.encode(env.ADMIN_USERNAME));
  return passOk && userOk;
}

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return bytesToHex(sig);
}

function ttl(env: Env): number {
  const n = parseInt(env.SESSION_TTL_SECONDS || '', 10);
  return Number.isFinite(n) && n > 0 ? n : 28800;
}

export async function createSession(env: Env, username: string): Promise<string> {
  const id = crypto.randomUUID();
  const data: SessionData = { u: username, iat: Date.now() };
  await env.SESSIONS.put('session:' + id, JSON.stringify(data), { expirationTtl: ttl(env) });
  if (env.SESSION_SECRET) return id + '.' + (await hmacHex(env.SESSION_SECRET, id));
  return id;
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k) out[k] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

async function tokenToId(env: Env, token: string): Promise<string | null> {
  if (!token) return null;
  if (!env.SESSION_SECRET) return token;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return null;
  const id = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmacHex(env.SESSION_SECRET, id);
  if (!constantTimeEqual(hexToBytes(sig), hexToBytes(expected))) return null;
  return id;
}

export async function getSession(env: Env, request: Request): Promise<SessionData | null> {
  const token = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE];
  const id = token ? await tokenToId(env, token) : null;
  if (!id) return null;
  const raw = await env.SESSIONS.get('session:' + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export async function destroySession(env: Env, request: Request): Promise<void> {
  const token = parseCookies(request.headers.get('Cookie'))[SESSION_COOKIE];
  const id = token ? await tokenToId(env, token) : null;
  if (id) await env.SESSIONS.delete('session:' + id);
}

export function sessionCookie(token: string, env: Env): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=${ttl(env)}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/admin; Max-Age=0`;
}
