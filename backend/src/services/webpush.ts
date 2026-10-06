import { query, supabaseInsert, supabaseDelete } from '../utils/prisma.js';
import { getEnv } from '../config/env.js';

const logger = {
  info: (obj: unknown, msg: string) => console.log(`[INFO] ${msg}`, obj),
  warn: (msg: string) => console.warn(`[WARN] ${msg}`),
  error: (obj: unknown, msg: string) => console.error(`[ERROR] ${msg}`, obj),
};

export interface NewEvent {
  id: string;
  magnitude: number;
  depth: number;
  place: string;
  time: string;
  source: string;
}

interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  minMagnitude: number;
}

export function isWebPushConfigured(): boolean {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = getEnv();
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
}

export async function saveSubscription(
  endpoint: string,
  keys: { p256dh: string; auth: string },
  minMagnitude: number
): Promise<void> {
  await supabaseInsert(
    'push_subscriptions',
    { id: crypto.randomUUID(), endpoint, p256dh: keys.p256dh, auth: keys.auth, minMagnitude },
    { deduplicateBy: 'endpoint' }
  );
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await supabaseDelete('push_subscriptions', `endpoint=eq.${encodeURIComponent(endpoint)}`);
}

// ── Web Push protocol (RFC 8291 + RFC 8188 aes128gcm), WebCrypto only ──

const te = new TextEncoder();

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data as BufferSource));
}

// HKDF-Expand (SHA-256, output <= 32 bytes fits a single block)
async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const t = await hmacSha256(prk, concat(info, new Uint8Array([1])));
  return t.slice(0, length);
}

interface SenderKey {
  pair: CryptoKeyPair;
  rawPublic: Uint8Array; // 65-byte uncompressed P-256 point
}
let senderKey: SenderKey | undefined;

async function getSenderKey(): Promise<SenderKey> {
  if (senderKey) return senderKey;
  const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const fresh: SenderKey = { pair, rawPublic: new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey) as ArrayBuffer) };
  senderKey = fresh;
  return fresh;
}

export async function getSenderPublicKeyRaw(): Promise<Uint8Array> {
  return (await getSenderKey()).rawPublic;
}

/** ponytail: single-record only (payloads here are <1KB); upgrade path = chunk at 4096-17 when notifications may exceed 4KB. */
export async function encryptPayloadAes128gcm(
  payload: Uint8Array,
  receiverP256dhRaw: Uint8Array,
  receiverAuthRaw: Uint8Array,
  salt: Uint8Array
): Promise<Uint8Array> {
  const sender = await getSenderKey();

  const receiverPub = await crypto.subtle.importKey(
    'raw', receiverP256dhRaw as BufferSource, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: receiverPub } as SubtleCryptoDeriveKeyAlgorithm,
    sender.pair.privateKey,
    256
  ));

  const keyPrk = await hmacSha256(receiverAuthRaw, ecdh);
  const key = await hkdfExpand(
    keyPrk,
    concat(te.encode('WebPush: info'), new Uint8Array([0]), receiverP256dhRaw, sender.rawPublic),
    32
  );
  const prk = await hmacSha256(salt, key);
  const cek = await hkdfExpand(prk, concat(te.encode('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16);
  const nonce = await hkdfExpand(prk, concat(te.encode('Content-Encoding: nonce'), new Uint8Array([0])), 12);

  const cekKey = await crypto.subtle.importKey('raw', cek as BufferSource, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce as BufferSource }, cekKey, concat(payload, new Uint8Array([2])) as BufferSource
  ));

  const header = new Uint8Array(16 + 4 + 1 + sender.rawPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = sender.rawPublic.length; // keyid = sender public key (RFC 8188)
  header.set(sender.rawPublic, 21);
  return concat(header, ciphertext);
}

let vapidSignKey: CryptoKey | undefined;
let vapidSignKeyFingerprint = '';

async function getVapidSignKey(): Promise<CryptoKey> {
  const pem = getEnv().VAPID_PRIVATE_KEY.trim();
  const fingerprint = pem.length + pem.slice(-8);
  if (vapidSignKey && vapidSignKeyFingerprint === fingerprint) return vapidSignKey;
  if (pem.startsWith('-----BEGIN')) {
    const der = b64ToBytes(pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, ''));
    vapidSignKey = await crypto.subtle.importKey(
      'pkcs8', der as BufferSource, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    );
  } else {
    // web-push generate-vapid-keys outputs raw 32-byte b64u scalar, not PEM —
    // rebuild a JWK signer using x/y from the configured public key.
    const pub = b64ToBytes(getEnv().VAPID_PUBLIC_KEY);
    vapidSignKey = await crypto.subtle.importKey(
      'jwk',
      { kty: 'EC', crv: 'P-256', ext: true, d: pem, x: bytesToB64Url(pub.subarray(1, 33)), y: bytesToB64Url(pub.subarray(33, 65)) },
      { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
    );
  }
  vapidSignKeyFingerprint = fingerprint;
  return vapidSignKey;
}

// ES256 output is DER in spec-compliant runtimes (workerd) but some (node WebCrypto)
// already return raw 64-byte r||s; JOSE always needs the latter.
export function derToRawEcdsaSig(der: Uint8Array): Uint8Array {
  if (der.length === 64) return der.slice();
  const readInt = (start: number): [Uint8Array, number] => {
    let i = start + 1;
    let len = der[i++];
    if (len & 0x80) { const n = len & 0x7f; len = 0; for (let j = 0; j < n; j++) len = (len << 8) | der[i++]; }
    if (der[i] === 0x00) { i++; len--; }
    return [der.subarray(i, i + len), i + len];
  };
  const [r, afterR] = readInt(2);
  const [s] = readInt(afterR);
  const out = new Uint8Array(64);
  out.set(r.slice(-32), 32 - Math.min(r.length, 32));
  out.set(s.slice(-32), 64 - Math.min(s.length, 32));
  return out;
}

export async function signVapidJwt(audience: string): Promise<string> {
  const { VAPID_SUBJECT } = getEnv();
  const header = bytesToB64Url(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payload = bytesToB64Url(te.encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })));
  const signingKey = await getVapidSignKey();
  const derSig = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, signingKey, te.encode(`${header}.${payload}`) as BufferSource
  ));
  return `${header}.${payload}.${bytesToB64Url(derToRawEcdsaSig(derSig))}`;
}

async function sendToSubscription(
  sub: StoredSubscription,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const body = await encryptPayloadAes128gcm(
      te.encode(JSON.stringify(payload)),
      b64ToBytes(sub.p256dh),
      b64ToBytes(sub.auth),
      crypto.getRandomValues(new Uint8Array(16))
    );
    const jwt = await signVapidJwt(new URL(sub.endpoint).origin);

    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        TTL: '3600',
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(body.byteLength),
        'Crypto-Key': `p256dh=${sub.p256dh}`,
        Authorization: `vapid t=${jwt}, k=${getEnv().VAPID_PUBLIC_KEY}`,
      },
      body: body as BufferSource,
    });

    if (res.status === 404 || res.status === 410) {
      await removeSubscription(sub.endpoint).catch(() => {});
      logger.info({ endpoint: sub.endpoint }, 'Removed dead push subscription');
      return;
    }
    if (!res.ok) {
      logger.error({ status: res.status, endpoint: sub.endpoint }, 'Web push send failed');
    }
  } catch (err) {
    logger.error({ error: err instanceof Error ? err.message : String(err), endpoint: sub.endpoint }, 'Web push send error');
  }
}

/**
 * Push one notification per (event, subscription) where the event magnitude
 * meets the subscription's threshold. Payload shape matches sw.js 'push' handler.
 */
export async function notifySubscribers(events: NewEvent[]): Promise<void> {
  if (events.length === 0) return;
  if (!isWebPushConfigured()) {
    logger.warn('VAPID keys not configured, skipping web push');
    return;
  }

  let subs: StoredSubscription[];
  try {
    subs = await query<StoredSubscription>(
      'push_subscriptions?select=endpoint,p256dh,auth,minMagnitude'
    );
  } catch (error) {
    logger.error({ error }, 'Failed to load push subscriptions');
    return;
  }
  if (subs.length === 0) return;

  for (const event of events) {
    const targets = subs.filter((s) => event.magnitude >= s.minMagnitude);
    if (targets.length === 0) continue;

    const jamWib = new Date(event.time).toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
    const payload = {
      title: `⚠️ Gempa M${event.magnitude.toFixed(1)} — ${event.place}`,
      body: `Kedalaman ${event.depth} km · ${jamWib} WIB · sumber ${event.source}`,
      tag: `quake-${event.id}`,
      requireInteraction: event.magnitude >= 5,
      data: { url: '/alerts', eventId: event.id },
    };

    logger.info({ eventId: event.id, count: targets.length }, 'Sending web push');
    await Promise.allSettled(targets.map((s) => sendToSubscription(s, payload)));
  }
}
