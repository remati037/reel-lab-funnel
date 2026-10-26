// Meta Conversions API: isti događaji kao Pixel u browseru, poslati sa servera,
// da merenje radi i kad browser blokira Pixel. Šalje se samo ako je kupac pristao na kolačiće,
// i sa istim event_id kao Pixel, da Meta ne broji dvaput.

const sha256 = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s.trim().toLowerCase())))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

// meta: metadata iz Stripe sesije ili sa forme (consent, fbp, fbc, fbclid, ip, ua, url)
export async function metaEvent(env, { name, eventId, email, meta = {}, value, currency, time }) {
  if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN || meta.consent !== "1") return;

  const fbc = meta.fbc || (meta.fbclid ? `fb.1.${Date.now()}.${meta.fbclid}` : undefined);
  const event = {
    event_name: name,
    event_time: time || Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: meta.url || "https://studio.aiprofit.rs/",
    user_data: {
      ...(email && { em: [await sha256(email)] }),
      ...(meta.ip && { client_ip_address: meta.ip }),
      ...(meta.ua && { client_user_agent: meta.ua }),
      ...(meta.fbp && { fbp: meta.fbp }),
      ...(fbc && { fbc }),
    },
    ...(value != null && { custom_data: { value, currency: (currency || "eur").toUpperCase() } }),
  };

  const r = await fetch(`https://graph.facebook.com/v23.0/${env.META_PIXEL_ID}/events?access_token=${env.META_CAPI_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [event], ...(env.META_TEST_CODE && { test_event_code: env.META_TEST_CODE }) }),
  });
  if (!r.ok) throw new Error(`Meta CAPI ${name}: ${r.status} ${await r.text()}`);
}

// IP i browser kupca, za CAPI
export function clientInfo(request) {
  return {
    ip: request.headers.get("CF-Connecting-IP") || undefined,
    ua: (request.headers.get("User-Agent") || "").slice(0, 400) || undefined,
  };
}
