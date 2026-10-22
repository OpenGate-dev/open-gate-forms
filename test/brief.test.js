// Local test: runs the /api/brief handler with a fake request and a mocked email service.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import handler from '../api/brief.js';

process.env.RESEND_API_KEY = 'test_key';
process.env.NOTIFY_TO = 'info@open-gate.us';

const sent = [];
globalThis.fetch = async (url, opts) => {
  sent.push({ url, body: JSON.parse(opts.body) });
  return { ok: true, json: async () => ({ id: 'mock' }), text: async () => '' };
};

function call(body, { origin = 'https://open-gate.us', method = 'POST', ip = '1.2.3.4' } = {}) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = method;
  req.headers = { origin, 'x-forwarded-for': ip };
  return new Promise((resolve) => {
    const res = {
      statusCode: 200, headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      end(b) { resolve({ status: this.statusCode, headers: this.headers, body: b ? JSON.parse(b) : null }); },
    };
    handler(req, res);
  });
}

const good = {
  fullName: 'Bob Biller', brandName: 'Biller Goods', designStyle: 'AI', email: 'Bob@Biller.com', consent: true,
  startedAt: Date.now() - 60_000, website: '', page: 'https://open-gate.us/pages/brief',
  cart: [{ title: 'Apex Focus Store', variant: 'Art Niche', qty: 1 }],
};

let r = await call(good);
assert.equal(r.status, 200); assert.equal(r.body.ok, true);
assert.equal(sent.length, 1);
assert.equal(sent[0].url, 'https://api.resend.com/emails');
assert.equal(sent[0].body.reply_to, 'bob@biller.com');
assert.match(sent[0].body.subject, /Biller Goods \(AI\)/);
assert.equal(r.headers['access-control-allow-origin'], 'https://open-gate.us');
writeFileSync(new URL('./last-email.html', import.meta.url), sent[0].body.html);
console.log('✓ valid brief sends one email, reply-to is the client');

r = await call({ ...good, email: 'nope' }, { ip: '2.2.2.2' });
assert.equal(r.status, 422); assert.equal(r.body.fields.email, 'invalid');
r = await call({ ...good, consent: false }, { ip: '2.2.2.3' });
assert.equal(r.status, 422); assert.equal(r.body.fields.consent, 'required');
r = await call({ ...good, designStyle: 'Pink' }, { ip: '2.2.2.4' });
assert.equal(r.status, 422);
console.log('✓ bad email, missing consent and unknown style are rejected');

const before = sent.length;
r = await call({ ...good, website: 'http://spam' }, { ip: '3.3.3.3' });
assert.equal(r.status, 200); assert.equal(sent.length, before);
r = await call({ ...good, startedAt: Date.now() }, { ip: '3.3.3.4' });
assert.equal(r.status, 200); assert.equal(sent.length, before);
console.log('✓ bots (hidden field, instant submit) get no email');

r = await call(good, { origin: 'https://evil.example' });
assert.equal(r.status, 403);
r = await call(good, { method: 'OPTIONS' });
assert.equal(r.status, 204);
console.log('✓ other websites are blocked, preflight works');

for (let i = 0; i < 5; i++) await call(good, { ip: '9.9.9.9' });
r = await call(good, { ip: '9.9.9.9' });
assert.equal(r.status, 429);
console.log('✓ more than 5 submissions in 10 minutes from one visitor are refused');

const esc = await call({ ...good, brandName: '<script>x</script>' }, { ip: '4.4.4.4' });
assert.equal(esc.status, 200);
assert.ok(!sent.at(-1).body.html.includes('<script>x'));
console.log('✓ typed HTML is escaped in the email');
console.log('\nAll tests passed.');
