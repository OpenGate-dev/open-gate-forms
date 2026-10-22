// POST /api/brief  — receives the pre-checkout project brief and notifies the team.
import { randomUUID } from 'node:crypto';
import { cors, readJson, send, clientIp, rateLimited } from '../lib/http.js';
import { validateBrief, looksLikeBot, briefEmail } from '../lib/brief.js';
import { sendEmail, sendTelegram, recipients } from '../lib/notify.js';

export default async function handler(req, res) {
  if (!cors(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method_not_allowed' });

  let body;
  try {
    body = await readJson(req);
  } catch {
    return send(res, 400, { ok: false, error: 'bad_json' });
  }

  // Bots get a normal-looking success so they don't retry, but nothing is sent.
  if (looksLikeBot(body)) return send(res, 200, { ok: true });

  const ip = clientIp(req);
  if (rateLimited(ip)) return send(res, 429, { ok: false, error: 'too_many_requests' });

  const { data, errors, ok } = validateBrief(body);
  if (!ok) return send(res, 422, { ok: false, error: 'invalid', fields: errors });

  const meta = { id: randomUUID().slice(0, 8).toUpperCase(), ip, receivedAt: new Date().toISOString() };
  const mail = briefEmail(data, meta);

  const results = await Promise.allSettled([
    sendEmail({ to: recipients(), subject: mail.subject, html: mail.html, text: mail.text, replyTo: data.email }),
    sendTelegram(mail.telegram),
  ]);
  const [emailRes, tgRes] = results;
  if (emailRes.status === 'rejected') console.error('email failed', meta.id, emailRes.reason?.message);
  if (tgRes.status === 'rejected') console.error('telegram failed', meta.id, tgRes.reason?.message);

  const delivered = emailRes.status === 'fulfilled' || (tgRes.status === 'fulfilled' && !tgRes.value?.skipped);
  if (!delivered) return send(res, 502, { ok: false, error: 'delivery_failed', ref: meta.id });

  console.log('brief received', meta.id, data.brandName);
  return send(res, 200, { ok: true, ref: meta.id });
}
