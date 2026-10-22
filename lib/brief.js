// Project brief: validation and the internal notification email.
import { esc } from './http.js';

export const STYLES = ['Smooth', 'Futuristic', 'Dark', 'Modern', 'AI'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

export function validateBrief(body) {
  const data = {
    fullName: clean(body.fullName, 120),
    brandName: clean(body.brandName, 120),
    designStyle: clean(body.designStyle, 20),
    email: clean(body.email, 200).toLowerCase(),
    consent: body.consent === true,
    page: clean(body.page, 300),
    cart: Array.isArray(body.cart)
      ? body.cart.slice(0, 10).map((i) => ({ title: clean(i.title, 150), variant: clean(i.variant, 100), qty: Number(i.qty) || 1 }))
      : [],
  };
  const errors = {};
  if (data.fullName.length < 2) errors.fullName = 'required';
  if (!data.brandName) errors.brandName = 'required';
  if (!STYLES.includes(data.designStyle)) errors.designStyle = 'invalid';
  if (!EMAIL_RE.test(data.email)) errors.email = 'invalid';
  if (!data.consent) errors.consent = 'required';
  return { data, errors, ok: Object.keys(errors).length === 0 };
}

// Spam signals: hidden "website" field filled, or the form submitted too fast.
export function looksLikeBot(body) {
  if (body.website) return true;
  const started = Number(body.startedAt);
  if (started && Date.now() - started < 2500) return true;
  return false;
}

export function briefEmail(d, meta) {
  const when = new Date(meta.receivedAt);
  const stamp = when.toLocaleString('en-GB', { timeZone: 'Europe/Bratislava', dateStyle: 'medium', timeStyle: 'short' }) + ' (Bratislava)';
  const F = "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;";
  const M = "font-family:'SFMono-Regular',Menlo,Consolas,monospace;";
  const row = (k, v, hi = false) =>
    `<tr><td style="padding:13px 0;border-bottom:1px solid #1f1f1f;${M}font-size:10.5px;letter-spacing:1.5px;color:#8c8c8c;white-space:nowrap;vertical-align:top;">${k}</td>` +
    `<td style="padding:13px 0 13px 14px;border-bottom:1px solid #1f1f1f;${F}font-size:15px;font-weight:700;color:${hi ? '#c5ff6e' : '#ffffff'};text-align:right;word-break:break-word;">${v}</td></tr>`;
  const cartRows = d.cart.length
    ? d.cart.map((i) => `${esc(i.title)}${i.variant ? ` <span style="color:#8c8c8c;font-weight:400;">(${esc(i.variant)})</span>` : ''} &times; ${i.qty}`).join('<br>')
    : '<span style="color:#8c8c8c;font-weight:400;">Not available</span>';
  const subject = `New project brief: ${d.brandName} (${d.designStyle})`;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#000;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000"><tr><td align="center" style="padding:20px 8px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#0a0a0a;border:1px solid #232323;border-radius:18px;">
<tr><td style="padding:20px 24px 14px;border-bottom:1px solid #1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="${F}font-size:15px;font-weight:800;color:#fff;">Open Gate<span style="color:#c5ff6e;">.</span> <span style="${M}font-size:10px;letter-spacing:2px;color:#6b6b6b;font-weight:400;">&nbsp;FORMS</span></td>
    <td align="right"><span style="display:inline-block;background:#141f05;border:1px solid #3d5a12;border-radius:6px;padding:5px 9px;${M}font-size:10px;letter-spacing:1.5px;color:#c5ff6e;font-weight:700;">NEW BRIEF</span></td>
  </tr></table>
</td></tr>
<tr><td style="padding:24px 24px 6px;">
  <p style="margin:0 0 6px;${M}font-size:11px;letter-spacing:2px;color:#c5ff6e;">PROJECT BRIEF RECEIVED</p>
  <h1 style="margin:0 0 6px;${F}font-size:26px;line-height:1.15;color:#fff;font-weight:800;letter-spacing:-.6px;">${esc(d.brandName)}</h1>
  <p style="margin:0;${F}font-size:14px;color:#a3a3a3;">from ${esc(d.fullName)} &middot; ${esc(stamp)}</p>
</td></tr>
<tr><td style="padding:14px 24px 4px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${row('FULL NAME', esc(d.fullName))}
    ${row('BRAND NAME', esc(d.brandName))}
    ${row('DESIGN STYLE', esc(d.designStyle) + (d.designStyle === 'AI' ? ' <span style="color:#8c8c8c;font-weight:400;">(match to niche)</span>' : ''), true)}
    ${row('PORTAL EMAIL', `<a href="mailto:${esc(d.email)}" style="color:#fff;text-decoration:none;">${esc(d.email)}</a>`)}
    ${row('CART', cartRows)}
    ${row('CONSENT', `Yes &middot; ${esc(stamp.replace(' (Bratislava)', ''))}`)}
  </table>
</td></tr>
<tr><td style="padding:18px 24px 24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#c5ff6e" style="border-radius:999px;">
    <a href="mailto:${esc(d.email)}?subject=${encodeURIComponent('Your ' + d.brandName + ' project')}" style="display:inline-block;padding:13px 26px;${F}font-size:14px;font-weight:800;color:#0b1400;text-decoration:none;">Reply to ${esc(d.fullName.split(' ')[0])} &rarr;</a>
  </td></tr></table>
  <p style="margin:12px 0 0;${F}font-size:12px;color:#6b6b6b;line-height:1.5;">Pressing Reply in your inbox also writes to the client. The brand name and style are saved on the order in Shopify too.</p>
</td></tr>
<tr><td style="padding:14px 24px 18px;border-top:1px solid #1a1a1a;${F}font-size:11px;color:#5c5c5c;line-height:1.5;">
  Page: ${esc(d.page || 'unknown')}<br>Ref: ${esc(meta.id)} &middot; IP: ${esc(meta.ip)}
</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    `New project brief: ${d.brandName}`,
    '',
    `Full name:    ${d.fullName}`,
    `Brand name:   ${d.brandName}`,
    `Design style: ${d.designStyle}`,
    `Portal email: ${d.email}`,
    `Cart:         ${d.cart.map((i) => `${i.title}${i.variant ? ' (' + i.variant + ')' : ''} x ${i.qty}`).join(', ') || 'n/a'}`,
    `Consent:      Yes, ${when.toISOString()}`,
    `Received:     ${stamp}`,
    `Ref:          ${meta.id}`,
  ].join('\n');
  const telegram =
    `<b>New project brief</b>\n` +
    `<b>${esc(d.brandName)}</b> · ${esc(d.designStyle)}\n` +
    `${esc(d.fullName)} · ${esc(d.email)}\n` +
    (d.cart.length ? `Cart: ${esc(d.cart.map((i) => i.title).join(', '))}\n` : '') +
    `${esc(stamp)}`;
  return { subject, html, text, telegram };
}
