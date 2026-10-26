import { stripe, currentPriceKey, SOURCE } from "./stripe.js";
import { metaEvent, clientInfo } from "./meta.js";
import { readOffer } from "./offer.js";
import { track } from "./notify.js";

const TRACKED = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ph_id", "fbp", "fbc", "consent"];

// GET /api/checkout?utm_... → stari linkovi (ManyChat, mejlovi) vode na našu checkout stranicu
export function checkoutRedirect(request) {
  const url = new URL(request.url);
  return Response.redirect(`${url.origin}/checkout${url.search}`, 303);
}

// POST /api/checkout { params: { utm_... } } → { clientSecret, publishableKey } | { test: true } | { closed: true }
// Pravi Stripe Checkout Session za našu dizajniranu stranicu: polja za karticu daje Stripe Payment Element.
export async function checkout(request, env) {
  // Dok Stripe ključ nije podešen, stranica radi u test modu (simulacija)
  if (!env.STRIPE_SECRET_KEY) return Response.json({ test: true });

  const { params = {} } = await request.json().catch(() => ({}));
  // Lični link iz mejla (67€ do roka) važi i kad su vrata zatvorena
  const offer = await readOffer(env, params.ponuda);
  const priceKey = offer ? "studio_lead" : currentPriceKey(env);
  if (!priceKey) return Response.json({ closed: true });

  const metadata = { source: SOURCE, price_type: priceKey };
  for (const k of TRACKED) if (typeof params[k] === "string" && params[k]) metadata[k] = params[k].slice(0, 200);
  // IP i browser samo uz pristanak na kolačiće, za Meta Conversions API
  if (metadata.consent === "1") Object.assign(metadata, clientInfo(request));

  const s = stripe(env);
  const { data: prices } = await s.prices.list({ lookup_keys: [priceKey], active: true });
  if (!prices[0]) throw new Error(`Nema Stripe cene sa lookup_key ${priceKey}`);

  const origin = new URL(request.url).origin;
  const session = await s.checkout.sessions.create({
    ui_mode: "elements",
    mode: "payment",
    line_items: [{ price: prices[0].id, quantity: 1 }],
    customer_creation: "always",
    // Čuva karticu za one-click upsell na /ponuda
    payment_intent_data: { setup_future_usage: "off_session", metadata },
    // Upsell naplaćuje sačuvanu karticu (uklj. Apple Pay, Google Pay, Link). Bancontact i iDEAL
    // bi umesto kartice ostavili SEPA nalog, pa ih ovde ne nudimo.
    excluded_payment_method_types: ["bancontact", "ideal"],
    automatic_tax: { enabled: env.AUTOMATIC_TAX === "true" },
    metadata,
    return_url: `${origin}/ponuda?session_id={CHECKOUT_SESSION_ID}`,
  });

  await track(env, "checkout_started", {
    distinctId: metadata.ph_id || session.id,
    insertId: `ic-${session.id}`,
    properties: { price_type: priceKey, amount: prices[0].unit_amount / 100, utm_source: metadata.utm_source, utm_campaign: metadata.utm_campaign },
  }).catch((e) => console.error("posthog", e));
  await metaEvent(env, {
    name: "InitiateCheckout",
    eventId: `ic-${session.id}`,
    meta: { ...metadata, url: `${origin}/checkout` },
    value: prices[0].unit_amount / 100,
    currency: prices[0].currency,
  }).catch((e) => console.error("meta", e));

  return Response.json({
    clientSecret: session.client_secret,
    publishableKey: env.STRIPE_PUBLISHABLE_KEY,
    sessionId: session.id,
    ...(offer && { offer: { until: offer.until, email: offer.email } }),
  });
}

// POST /api/checkout/consent { session_id } → pre plaćanja beleži da je kupac prihvatio uslove
// (bez povraćaja posle pristupa). Vreme pristanka ostaje u metadata sesije.
export async function consent(request, env) {
  const { session_id } = await request.json().catch(() => ({}));
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(session_id || "")) return Response.json({ ok: false }, { status: 400 });

  const s = stripe(env);
  const session = await s.checkout.sessions.retrieve(session_id);
  if (session.metadata?.source !== SOURCE || session.status !== "open") return Response.json({ ok: false }, { status: 400 });

  await s.checkout.sessions.update(session_id, {
    metadata: { ...session.metadata, terms_accepted_at: new Date().toISOString() },
  });
  return Response.json({ ok: true });
}
