// Jalankan: npx esbuild scripts/webpush-selfcheck.ts --bundle --platform=node --format=esm \
//   --external:http_ece --outfile=/tmp/selfcheck.mjs && node /tmp/selfcheck.mjs
// Butuh (opsional, untuk cross-check): npm i -D http_ece -w backend
import assert from 'node:assert';
import { createECDH, createVerify, generateKeyPairSync, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { initEnv } from '../backend/src/config/env.js';
import { encryptPayloadAes128gcm, signVapidJwt } from '../backend/src/services/webpush.js';

const require_ = createRequire(import.meta.url);
const te = new TextEncoder();

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
const jwk = publicKey.export({ format: 'jwk' }) as { x: string; y: string };
const rawPub = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]);

initEnv({
  VAPID_PUBLIC_KEY: rawPub.toString('base64url'),
  VAPID_PRIVATE_KEY: pem,
  VAPID_SUBJECT: 'mailto:selfcheck@geoaware.test',
});

const receiver = createECDH('prime256v1');
receiver.generateKeys();
const authSecret = randomBytes(16);

const plaintext = JSON.stringify({ title: '⚠️ Gempa M 6.1', body: 'Tes self-check' });
const salt = randomBytes(16);
const body = await encryptPayloadAes128gcm(te.encode(plaintext), receiver.getPublicKey(), authSecret, salt);

const dv = new DataView(body.buffer, body.byteOffset, body.byteLength);
assert.strictEqual(dv.getUint32(16), 4096, 'rs harus 4096');
assert.strictEqual(body[20], 65, 'keyid harus 65 byte (sender public key)');
console.log('OK  header aes128gcm: salt(16) | rs=4096 | keyid=65');

try {
  const ece = require_('http_ece');
  const decrypted = Buffer.from(ece.decrypt(Buffer.from(body), {
    version: 'aes128gcm',
    privateKey: receiver,
    authSecret,
  }));
  assert.strictEqual(decrypted.toString(), plaintext, 'hasil decrypt http_ece harus persis payload');
  console.log('OK  aes128gcm: http_ece (implementasi independen) mendekripsi output kita persis');
} catch (e: unknown) {
  const err = e as { code?: string; message?: string };
  if (err.code === 'MODULE_NOT_FOUND') console.log('SKIP http_ece cross-check (npm i -D http_ece -w backend)');
  else { console.error('FAIL http_ece:', err.message); process.exitCode = 1; }
}

const [h, p, sig] = (await signVapidJwt('https://push.example.org')).split('.');
assert.strictEqual(JSON.parse(Buffer.from(h, 'base64url').toString()).alg, 'ES256');
const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
assert.strictEqual(claims.aud, 'https://push.example.org');
assert.strictEqual(claims.sub, 'mailto:selfcheck@geoaware.test');
const s = Buffer.from(sig, 'base64url');
assert.strictEqual(s.length, 64, 'signature ES256 JOSE harus 64 byte r||s');

// WebCrypto ES256 di sini mengembalikan raw r||s (64 B) = format ieee-p1363.
// one-shot verify() mengabaikan dsaEncoding (teramati di node 24) → pakai streaming.
const v = createVerify('sha256');
v.update(te.encode(`${h}.${p}`));
assert.ok(
  v.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, s),
  'VAPID JWT harus terverifikasi dengan public key sendiri'
);
const vBad = createVerify('sha256');
vBad.update(te.encode(`${h}.tampered`));
assert.ok(
  !vBad.verify({ key: publicKey, dsaEncoding: 'ieee-p1363' }, s),
  'signature utk payload berbeda harus ditolak'
);
console.log('OK  VAPID: JWT ES256 (aud/exp/sub + signature r||s) valid');
