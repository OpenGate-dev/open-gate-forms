// Delivery: email through Resend (https://resend.com) and an optional Telegram ping.

export async function sendEmail({ to, subject, html, text, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  const from = process.env.NOTIFY_FROM || 'Open Gate Forms <onboarding@resend.dev>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, text, reply_to: replyTo }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function sendTelegram(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return { skipped: true };
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: message, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!r.ok) throw new Error(`Telegram ${r.status}: ${await r.text()}`);
  return r.json();
}

export function recipients() {
  return (process.env.NOTIFY_TO || 'info@open-gate.us')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
