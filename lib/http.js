// Shared helpers: CORS, body parsing, simple rate limiting.

const DEFAULT_ORIGINS = [
  'https://open-gate.us',
  'https://www.open-gate.us',
];

export function allowedOrigins() {
  const extra = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...extra];
}

// Returns true when the request may continue.
export function cors(req, res) {
  const origin = req.headers.origin || '';
  const ok =
    allowedOrigins().includes(origin) || /^https:\/\/[a-z0-9-]+\.myshopify\.com$/.test(origin);
  if (ok) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') {
    res.statusCode = ok ? 204 : 403;
    res.end();
    return false;
  }
  if (!ok) {
    send(res, 403, { ok: false, error: 'origin_not_allowed' });
    return false;
  }
  return true;
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 20_000) throw new Error('too_large');
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (Array.isArray(fwd) ? fwd[0] : (fwd || '')).split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}

// Best-effort limiter (per warm server instance): 5 submissions per IP per 10 minutes.
const hits = new Map();
export function rateLimited(ip, max = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  return list.length > max;
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
