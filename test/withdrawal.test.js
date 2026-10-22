// Local test: runs /api/withdrawal with a fake request and a mocked email service.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import handler from '../api/withdrawal.js';

process.env.RESEND_API_KEY = 'test_key';
process.env.NOTIFY_TO = 'info@open-gate.us';

let sent = [];
let failClient = false;
globalThis.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body);
  if (failClient && body.to?.[0] === 'bob@biller.com') return { ok: false, status: 403, text: async () => 'domain not verified' };
  sent.push({ url, body });
  return { ok: true, json: async () => ({ id: 'mock' }), text: async () => '' };
};

function call(body, { origin = 'https://open-gate.us', ip = '1.1.1.1' } = {}) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  req.method = 'POST';
  req.headers = { origin, 'x-forwarded-for': ip };
  return new Promise((resolve) => {
    const res = { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { resolve({ status: this.statusCode, body: b ? JSON.parse(b) : null }); } };
    handler(req, res);
  });
}

const good = {
  firstName: 'Bob', lastName: 'Biller', email: 'bob@biller.com', address: 'Main St 1, Bratislava',
  orderNumber: '#1234', purchaseDate: '2026-10-18', service: 'Store build', reason: 'Changed my plans.',
  declaration: true, startedAt: Date.now() - 60_000, website: '', page: 'https://open-gate.us/pages/withdrawal',
};

let r = await call(good);
assert.equal(r.status, 200); assert.equal(r.body.ok, true); assert.match(r.body.ref, /^WD-[A-Z2-9]{6}$/); assert.equal(r.body.clientEmailSent, true);
assert.equal(sent.length, 2);
const [client, team] = sent;
assert.deepEqual(client.body.to, ['bob@biller.com']); assert.equal(client.body.reply_to, 'info@open-gate.us');
assert.match(client.body.subject, new RegExp(r.body.ref));
assert.ok(client.body.html.includes('pro-rata charge') && client.body.html.includes('within 14 days'));
assert.deepEqual(team.body.to, ['info@open-gate.us']); assert.equal(team.body.reply_to, 'bob@biller.com');
assert.ok(team.body.html.includes('Changed my plans.'));
writeFileSync(new URL('./last-withdrawal-client.html', import.meta.url), client.body.html);
writeFileSync(new URL('./last-withdrawal-team.html', import.meta.url), team.body.html);
console.log('✓ valid notice: client gets a confirmation with the reference, team gets the full details');

sent = [];
for (const [k, v] of [['email', 'x'], ['orderNumber', 'abc'], ['purchaseDate', '2099-01-01'], ['service', 'Pizza'], ['declaration', false], ['firstName', ''], ['reason', '']]) {
  r = await call({ ...good, [k]: v }, { ip: 'v-' + k });
  assert.equal(r.status, 422, k); assert.ok(r.body.fields[k], k);
}
assert.equal(sent.length, 0);
console.log('✓ invalid email, order number, future date, unknown service, missing declaration, name and reason are rejected');

r = await call({ ...good, website: 'spam' }, { ip: 'bot' });
assert.equal(r.status, 200); assert.equal(sent.length, 0);
console.log('✓ bots get no email');

failClient = true; sent = [];
r = await call(good, { ip: '5.5.5.5' });
assert.equal(r.status, 200); assert.equal(r.body.clientEmailSent, false);
assert.equal(sent.length, 1); assert.ok(sent[0].body.html.includes('failed to send'));
failClient = false;
console.log('✓ if the client email fails, the team is told to contact the client');

r = await call(good, { origin: 'https://evil.example' });
assert.equal(r.status, 403);
console.log('✓ other websites are blocked');
console.log('\nAll withdrawal tests passed.');
