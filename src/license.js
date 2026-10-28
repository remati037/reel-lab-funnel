import { sendEmail, telegram } from "./notify.js";
import { licenseCodeEmail } from "./emails.js";

// Licenca za AI Video Editor plugin, vezana za mejl kojim je plaćen AI Video Editor.
// Plugin traži kod na mejl, kupac ga ukuca u Claude-u, plugin dobije token za taj računar.
// Posle toga plugin samo proverava token (verify). Chargeback ili brisanje računara gase token.

const CODE_TTL = 15 * 60 * 1000;
const MAX_WRONG = 5; // pogrešnih unosa pre nego što kod prestane da važi
const MAX_SENDS = 5; // kodova po mejlu na sat
const HOUR = 3600 * 1000;

const json = (body, status = 200) => Response.json(body, { status });
const normEmail = (e) => String(e || "").trim().toLowerCase();
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 200;
const maxDevices = (env) => Number(env.LICENSE_MAX_DEVICES) || 1;

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(bytes) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sixDigits() {
  // 0..999999 bez pristrasnosti: odbaci vrednosti iznad najvećeg višekratnika od 10^6
  const limit = Math.floor(0xffffffff / 1e6) * 1e6;
  let n;
  do n = crypto.getRandomValues(new Uint32Array(1))[0];
  while (n >= limit);
  return String(n % 1e6).padStart(6, "0");
}

// Da li mejl ima licencu: plaćen AI Video Editor (bez chargeback-a) ili ručno dodat
export async function hasLicense(env, email) {
  const row = await env.DB.prepare(
    `SELECT 1 FROM orders WHERE email = ? AND kind = 'studio' AND status = 'paid'
     UNION SELECT 1 FROM license_grants WHERE email = ? LIMIT 1`
  )
    .bind(email, email)
    .first();
  return !!row;
}

async function devices(env, email) {
  const { results } = await env.DB.prepare(
    "SELECT device_id, device_name, activated_at, last_seen FROM license_devices WHERE email = ? ORDER BY activated_at"
  )
    .bind(email)
    .all();
  return results;
}

async function readBody(request) {
  return request.json().catch(() => ({}));
}

// POST /api/license/code { email }
// Šalje 6-cifreni kod na mejl, samo ako taj mejl ima licencu.
export async function licenseCode(request, env) {
  const email = normEmail((await readBody(request)).email);
  if (!validEmail(email)) return json({ ok: false, reason: "bad_email", error: "Upiši ispravan mejl." }, 400);
  if (!(await hasLicense(env, email)))
    return json({ ok: false, reason: "no_purchase", error: "Za ovaj mejl nema kupovine AI Video Editora. Upiši mejl kojim si platio." }, 404);

  const now = Date.now();
  const prev = await env.DB.prepare("SELECT sent, window_at FROM license_codes WHERE email = ?").bind(email).first();
  const sameHour = prev && now - prev.window_at < HOUR;
  if (sameHour && prev.sent >= MAX_SENDS)
    return json({ ok: false, reason: "too_many", error: "Poslato je previše kodova. Probaj ponovo za sat vremena." }, 429);

  const code = sixDigits();
  await env.DB.prepare(
    `INSERT INTO license_codes (email, code_hash, expires_at, attempts, sent, window_at) VALUES (?, ?, ?, 0, 1, ?)
     ON CONFLICT (email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0,
       sent = ?, window_at = ?`
  )
    .bind(email, await sha256(`${email}:${code}`), now + CODE_TTL, now, sameHour ? prev.sent + 1 : 1, sameHour ? prev.window_at : now)
    .run();

  await sendEmail(env, { to: email, idempotencyKey: `license-code-${email}-${now}`, ...licenseCodeEmail(code) });
  return json({ ok: true });
}

// POST /api/license/activate { email, code, device_id, device_name }
// Proverava kod i aktivira licencu na ovom računaru. Vraća token koji plugin čuva.
export async function licenseActivate(request, env) {
  const body = await readBody(request);
  const email = normEmail(body.email);
  const code = String(body.code || "").replace(/\D/g, "");
  const deviceId = String(body.device_id || "").slice(0, 128);
  const deviceName = String(body.device_name || "").trim().slice(0, 80) || null;
  if (!validEmail(email) || code.length !== 6 || deviceId.length < 16)
    return json({ ok: false, reason: "bad_request", error: "Fali mejl, kod ili oznaka računara." }, 400);

  const row = await env.DB.prepare("SELECT code_hash, expires_at, attempts FROM license_codes WHERE email = ?").bind(email).first();
  if (!row || row.expires_at < Date.now() || row.attempts >= MAX_WRONG)
    return json({ ok: false, reason: "code_expired", error: "Kod je istekao. Zatraži novi." }, 400);
  if ((await sha256(`${email}:${code}`)) !== row.code_hash) {
    await env.DB.prepare("UPDATE license_codes SET attempts = attempts + 1 WHERE email = ?").bind(email).run();
    const left = MAX_WRONG - row.attempts - 1;
    return json({ ok: false, reason: "wrong_code", error: left > 0 ? `Kod nije tačan. Još ${left} pokušaja.` : "Kod nije tačan. Zatraži novi." }, 400);
  }
  // Kod važi samo jednom
  await env.DB.prepare("UPDATE license_codes SET expires_at = 0 WHERE email = ?").bind(email).run();

  if (!(await hasLicense(env, email))) return json({ ok: false, reason: "revoked", error: "Licenca za ovaj mejl nije aktivna." }, 403);

  const list = await devices(env, email);
  const known = list.some((d) => d.device_id === deviceId);
  if (!known && list.length >= maxDevices(env))
    return json(
      {
        ok: false,
        reason: "device_limit",
        error: maxDevices(env) === 1 ? "Licenca je već aktivna na drugom računaru." : `Licenca je već aktivna na ${list.length} računara, koliko je najviše dozvoljeno.`,
        devices: list.map((d) => ({ name: d.device_name, activated_at: d.activated_at, last_seen: d.last_seen })),
      },
      403
    );

  // Isti računar ponovo: novi token zamenjuje stari
  const token = randomHex(32);
  await env.DB.prepare(
    `INSERT INTO license_devices (email, device_id, device_name, token_hash) VALUES (?, ?, ?, ?)
     ON CONFLICT (email, device_id) DO UPDATE SET token_hash = excluded.token_hash, device_name = excluded.device_name,
       last_seen = datetime('now')`
  )
    .bind(email, deviceId, deviceName, await sha256(token))
    .run();

  if (!known) await telegram(env, `🔑 AI Video Editor aktiviran\n${email}\n${deviceName || "računar"} (${list.length + 1}/${maxDevices(env)})`).catch(() => {});
  return json({ ok: true, token, email, devices: list.length + (known ? 0 : 1), max_devices: maxDevices(env) });
}

// POST /api/license/verify { token, device_id }
// Plugin pita na početku četa. Ništa ne menja osim "poslednji put viđen".
export async function licenseVerify(request, env) {
  const body = await readBody(request);
  const token = String(body.token || "");
  if (!/^[0-9a-f]{64}$/.test(token)) return json({ ok: false, reason: "unknown" }, 401);

  const dev = await env.DB.prepare("SELECT email, device_id FROM license_devices WHERE token_hash = ?").bind(await sha256(token)).first();
  // Token sa drugog računara (kopiran folder) ne važi
  if (!dev || (body.device_id && body.device_id !== dev.device_id)) return json({ ok: false, reason: "unknown" }, 401);
  if (!(await hasLicense(env, dev.email))) return json({ ok: false, reason: "revoked", email: dev.email }, 403);

  await env.DB.prepare("UPDATE license_devices SET last_seen = datetime('now') WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: true, email: dev.email });
}

// POST /api/license/deactivate { token }
// "Odjavi AI Video Editor sa ovog računara": oslobađa mesto za drugi računar.
export async function licenseDeactivate(request, env) {
  const token = String((await readBody(request)).token || "");
  if (!/^[0-9a-f]{64}$/.test(token)) return json({ ok: false, reason: "unknown" }, 401);
  const res = await env.DB.prepare("DELETE FROM license_devices WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: res.meta.changes > 0 });
}
