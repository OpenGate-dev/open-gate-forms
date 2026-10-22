// Withdrawal notice: validation, reference number and the two emails (client confirmation + team notification).
import { randomBytes } from 'node:crypto';
import { esc } from './http.js';

export const SERVICES = [
  'Store build', 'App Builder', 'AI Business Model', 'Cash Flow with Affiliate', 'YouTube Automation',
  'Trading Course A-Z', 'SEO Optimization', 'Marketing Strategy', 'Other',
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function validateWithdrawal(body) {
  const data = {
    firstName: clean(body.firstName, 80),
    lastName: clean(body.lastName, 80),
    email: clean(body.email, 200).toLowerCase(),
    address: clean(body.address, 300),
    orderNumber: clean(body.orderNumber, 40),
    purchaseDate: clean(body.purchaseDate, 10),
    service: clean(body.service, 60),
    reason: String(body.reason ?? '').trim().slice(0, 2000),
    declaration: body.declaration === true,
    page: clean(body.page, 300),
  };
  const errors = {};
  if (!data.firstName) errors.firstName = 'required';
  if (!data.lastName) errors.lastName = 'required';
  if (!EMAIL_RE.test(data.email)) errors.email = 'invalid';
  if (!/\d/.test(data.orderNumber)) errors.orderNumber = 'invalid';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(data.purchaseDate) ? new Date(data.purchaseDate + 'T12:00:00Z') : null;
  if (!d || isNaN(d) || d.getTime() > Date.now() + 36e5 * 24) errors.purchaseDate = 'invalid';
  if (!SERVICES.includes(data.service)) errors.service = 'invalid';
  if (!data.declaration) errors.declaration = 'required';
  return { data, errors, ok: Object.keys(errors).length === 0 };
}

export function newRef() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'WD-' + [...randomBytes(6)].map((b) => abc[b % abc.length]).join('');
}

const F = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;";
const M = "font-family:'SFMono-Regular',Menlo,Consolas,monospace;";
const LOGO = 'https://cdn.shopify.com/s/files/1/0745/7144/8588/files/Official_Open_Gate_logo.png?v=1790442687';
const fmtDate = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtStamp = (d) => d.toLocaleString('en-GB', { timeZone: 'Europe/Bratislava', dateStyle: 'long', timeStyle: 'short' });

function row(k, v, last = false) {
  const b = last ? '' : 'border-bottom:1px solid #222222;';
  return `<tr><td style="padding:12px 0;${b}${M}font-size:10.5px;letter-spacing:1.4px;color:#7a7a78;white-space:nowrap;vertical-align:top;">${k}</td>` +
    `<td style="padding:12px 0 12px 14px;${b}${F}font-size:14.5px;font-weight:600;color:#ececea;text-align:right;word-break:break-word;">${v}</td></tr>`;
}
function note(color, bg, line, tag, title, text) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px;background:${bg};border:1px solid ${line};border-left:3px solid ${color};border-radius:8px;"><tr><td style="padding:13px 14px;">
    <span style="display:inline-block;${M}font-size:9.5px;letter-spacing:1.3px;font-weight:700;color:${color};border:1px solid ${line};border-radius:4px;padding:4px 7px;">&#9679; ${tag}</span>
    <p style="margin:8px 0 2px;${F}font-size:14px;font-weight:700;color:#ececea;">${title}</p>
    <p style="margin:0;${F}font-size:13.5px;line-height:1.5;color:#a3a3a1;">${text}</p></td></tr></table>`;
}
const shell = (title, pre, inner, footNote) => `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(pre)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0a0a0a"><tr><td align="center" style="padding:24px 10px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#101010;border:1px solid #262626;border-radius:10px;">
<tr><td style="padding:18px 24px;border-bottom:1px solid #222222;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td width="40"><img src="${LOGO}" width="30" alt="Open Gate" style="display:block;width:30px;height:auto;border:0;"></td>
    <td style="${F}font-size:15px;font-weight:700;color:#ececea;">Open Gate</td>
    <td align="right"><span style="display:inline-block;border:1px solid #333333;border-radius:4px;padding:5px 8px;${M}font-size:9.5px;letter-spacing:1.4px;color:#9a9a98;">WITHDRAWAL NOTICE</span></td>
  </tr></table>
</td></tr>
${inner}
<tr><td style="padding:16px 24px 20px;border-top:1px solid #222222;${F}font-size:11px;line-height:1.6;color:#6a6a68;">
  Open Gate &mdash; Ecommerce Systems &amp; Digital Agency &middot; open-gate.us &middot; info@open-gate.us &middot; +1 773 938 2507<br>
  US: 3501 Tioga Lk Cv, Lawrenceville, GA 30044 &middot; EU: Einsteinova 8, Bratislava<br>${footNote}
</td></tr>
</table></td></tr></table></body></html>`;

export function clientEmail(d, ref, receivedAt) {
  const subject = `We've received your withdrawal request (${ref})`;
  const inner = `
<tr><td style="padding:26px 24px 8px;">
  <p style="margin:0 0 8px;${M}font-size:10.5px;letter-spacing:2px;color:#9a9a98;">RIGHT OF WITHDRAWAL &middot; REQUEST RECEIVED</p>
  <h1 style="margin:0 0 12px;${F}font-size:24px;line-height:1.2;color:#ffffff;font-weight:700;letter-spacing:-.4px;">Your withdrawal request is being processed</h1>
  <p style="margin:0;${F}font-size:15px;line-height:1.6;color:#b5b5b3;">Dear ${esc(d.firstName)} ${esc(d.lastName)},<br><br>This email confirms that we have received your Right of Withdrawal request and that it is now being processed. Please keep your reference number for any questions about this request.</p>
</td></tr>
<tr><td style="padding:16px 24px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #262626;border-radius:8px;"><tr><td style="padding:2px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${row('REFERENCE', `<span style="${M}letter-spacing:1px;color:#ffffff;">${ref}</span>`)}
    ${row('ORDER NUMBER', esc(d.orderNumber))}
    ${row('DATE OF PURCHASE', esc(fmtDate(d.purchaseDate)))}
    ${row('SERVICE', esc(d.service))}
    ${row('SUBMITTED', esc(fmtStamp(receivedAt)), true)}
  </table></td></tr></table>
</td></tr>
<tr><td style="padding:20px 24px 6px;">
  <p style="margin:0 0 10px;${M}font-size:10.5px;letter-spacing:2px;color:#9a9a98;">WHAT HAPPENS NEXT</p>
  ${note('#ff5c5c', '#1f0c0c', '#5a2020', 'IMPORTANT', 'Completed work is charged', 'A pro-rata charge will apply for any work already completed at the time of your request.')}
  ${note('#ffb020', '#1f1806', '#5a4210', 'TIMELINE', 'Response within 14 days', 'You will be contacted within 14 days with the outcome and any applicable refund calculation.')}
  ${note('#9a9a98', '#141414', '#2e2e2e', 'INFO', 'How refunds are paid', 'Any refund is made using the same payment method you used for the original order.')}
</td></tr>
<tr><td style="padding:14px 24px 26px;">
  <p style="margin:0 0 4px;${F}font-size:14px;line-height:1.6;color:#b5b5b3;">If you have any questions in the meantime, reply to this email or contact us at <a href="mailto:info@open-gate.us" style="color:#ffffff;">info@open-gate.us</a>, quoting your reference number.</p>
  <p style="margin:16px 0 0;${F}font-size:14px;color:#ececea;">Kind regards,<br><b>The Open Gate Team</b></p>
</td></tr>`;
  const html = shell(subject, `Reference ${ref}. Your request is being processed; here is what happens next.`, inner,
    'You are receiving this email because a withdrawal request was submitted with this address at open-gate.us.');
  const text = [
    `Dear ${d.firstName} ${d.lastName},`, '',
    'We have received your Right of Withdrawal request and confirm it is being processed.', '',
    `Reference:        ${ref}`, `Order number:     ${d.orderNumber}`, `Date of purchase: ${fmtDate(d.purchaseDate)}`, `Service:          ${d.service}`, `Submitted:        ${fmtStamp(receivedAt)}`, '',
    'IMPORTANT: A pro-rata charge will apply for any work already completed at the time of your request.',
    'TIMELINE: You will be contacted within 14 days with the outcome and any applicable refund calculation.',
    'INFO: Any refund is made using the same payment method you used for the original order.', '',
    'Questions? Reply to this email or contact info@open-gate.us, quoting your reference number.', '',
    'Kind regards,', 'The Open Gate Team', 'open-gate.us',
  ].join('\n');
  return { subject, html, text };
}

export function teamEmail(d, ref, receivedAt, meta) {
  const subject = `Withdrawal request ${ref}: order ${d.orderNumber} (${d.service})`;
  const inner = `
<tr><td style="padding:24px 24px 6px;">
  <span style="display:inline-block;${M}font-size:10px;letter-spacing:1.4px;font-weight:700;color:#ff5c5c;border:1px solid #5a2020;background:#1f0c0c;border-radius:4px;padding:5px 8px;">&#9679; ACTION NEEDED &middot; REPLY WITHIN 14 DAYS</span>
  <h1 style="margin:12px 0 6px;${F}font-size:22px;line-height:1.2;color:#ffffff;font-weight:700;">Withdrawal request: order ${esc(d.orderNumber)}</h1>
  <p style="margin:0;${F}font-size:14px;color:#9a9a98;">${esc(d.firstName)} ${esc(d.lastName)} &middot; ${esc(fmtStamp(receivedAt))}</p>
</td></tr>
<tr><td style="padding:14px 24px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${row('REFERENCE', `<span style="${M}">${ref}</span>`)}
    ${row('NAME', `${esc(d.firstName)} ${esc(d.lastName)}`)}
    ${row('EMAIL', `<a href="mailto:${esc(d.email)}" style="color:#ececea;text-decoration:none;">${esc(d.email)}</a>`)}
    ${row('ADDRESS', d.address ? esc(d.address) : '<span style="color:#6a6a68;font-weight:400;">Not given</span>')}
    ${row('ORDER NUMBER', esc(d.orderNumber))}
    ${row('DATE OF PURCHASE', esc(fmtDate(d.purchaseDate)))}
    ${row('SERVICE', esc(d.service))}
    ${row('DECLARATION', 'Confirmed')}
    ${row('REASON', d.reason ? esc(d.reason).replace(/\n/g, '<br>') : '<span style="color:#6a6a68;font-weight:400;">Not given</span>', true)}
  </table>
</td></tr>
<tr><td style="padding:16px 24px 22px;">
  <p style="margin:0;${F}font-size:13px;line-height:1.6;color:#9a9a98;">Deadline to respond: <b style="color:#ffb020;">${esc(fmtDate(new Date(receivedAt.getTime() + 14 * 864e5).toISOString().slice(0, 10)))}</b>. The client received an automatic confirmation${meta.clientSent ? '' : ' <b style="color:#ff5c5c;">(failed to send, contact them directly)</b>'}. Pressing Reply writes to the client.</p>
  <p style="margin:10px 0 0;${F}font-size:11px;color:#5c5c5a;">Page: ${esc(d.page || 'unknown')} &middot; IP: ${esc(meta.ip)}</p>
</td></tr>`;
  const html = shell(subject, `${d.firstName} ${d.lastName} submitted a withdrawal request for order ${d.orderNumber}.`, inner, 'Internal notification from Open Gate Forms.');
  const text = [
    `Withdrawal request ${ref}`, '',
    `Name: ${d.firstName} ${d.lastName}`, `Email: ${d.email}`, `Address: ${d.address || '-'}`, `Order: ${d.orderNumber}`,
    `Purchased: ${fmtDate(d.purchaseDate)}`, `Service: ${d.service}`, `Reason: ${d.reason || '-'}`, `Submitted: ${fmtStamp(receivedAt)}`,
  ].join('\n');
  const telegram = `<b>Withdrawal request</b> ${ref}\nOrder ${esc(d.orderNumber)} · ${esc(d.service)}\n${esc(d.firstName)} ${esc(d.lastName)} · ${esc(d.email)}`;
  return { subject, html, text, telegram };
}
