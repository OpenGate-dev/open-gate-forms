// GET /api/health — quick check that the backend is live and configured.
export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    JSON.stringify({
      ok: true,
      email: Boolean(process.env.RESEND_API_KEY),
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      notifyTo: (process.env.NOTIFY_TO || 'info@open-gate.us').split(',').length + ' recipient(s)',
    })
  );
}
