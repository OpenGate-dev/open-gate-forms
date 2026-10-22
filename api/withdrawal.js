// POST /api/withdrawal — receives a Right of Withdrawal notice, confirms it to the client and notifies the team.
import { cors, readJson, send, clientIp, rateLimited } from '../lib/http.js';
import { looksLikeBot } from '../lib/brief.js';
import { validateWithdrawal, newRef, clientEmail, teamEmail } from '../lib/withdrawal.js';
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
  if (looksLikeBot(body)) return send(res, 200, { ok: true, ref: newRef(), clientEmailSent: true });

  const ip = clientIp(req);
  if (rateLimited('wd:' + ip, 4)) return send(res, 429, { ok: false, error: 'too_many_requests' });

  const { data, errors, ok } = validateWithdrawal(body);
  if (!ok) return send(res, 422, { ok: false, error: 'invalid', fields: errors });

  const ref = newRef();
  const receivedAt = new Date();

  // 1) Confirmation to the client.
  let clientSent = false;
  try {
    const c = clientEmail(data, ref, receivedAt);
    await sendEmail({ to: [data.email], subject: c.subject, html: c.html, text: c.text, replyTo: process.env.REPLY_TO || 'info@open-gate.us' });
    clientSent = true;
  } catch (e) {
    console.error('client confirmation failed', ref, e.message);
  }

  // 2) Notification to the team (always attempted; says if the client email failed).
  const t = teamEmail(data, ref, receivedAt, { ip, clientSent });
  const [teamRes, tgRes] = await Promise.allSettled([
    sendEmail({ to: recipients(), subject: t.subject, html: t.html, text: t.text, replyTo: data.email }),
    sendTelegram(t.telegram),
  ]);
  if (teamRes.status === 'rejected') console.error('team email failed', ref, teamRes.reason?.message);
  if (tgRes.status === 'rejected') console.error('telegram failed', ref, tgRes.reason?.message);

  const teamNotified = teamRes.status === 'fulfilled' || (tgRes.status === 'fulfilled' && !tgRes.value?.skipped);
  if (!teamNotified && !clientSent) return send(res, 502, { ok: false, error: 'delivery_failed' });

  console.log('withdrawal received', ref, data.orderNumber);
  return send(res, 200, { ok: true, ref, clientEmailSent: clientSent });
}
