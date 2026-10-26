import { stripe, currentPriceKey, SOURCE } from "./stripe.js";

const TRACKED = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ph_id"];

// GET /api/checkout?utm_...  → 303 na Stripe Checkout
export async function checkout(request, env) {
  const url = new URL(request.url);

  // Dok Stripe ključ nije podešen, dugmad vode na test checkout
  if (!env.STRIPE_SECRET_KEY) return Response.redirect(`${url.origin}/checkout${url.search}`, 303);

  const priceKey = currentPriceKey(env);
  if (!priceKey) return Response.redirect(`${url.origin}/?zatvoreno=1`, 303);

  const s = stripe(env);
  const { data: prices } = await s.prices.list({ lookup_keys: [priceKey], active: true });
  const studio = prices[0];
  if (!studio) throw new Error(`Nema Stripe cene sa lookup_key ${priceKey}`);

  const metadata = { source: SOURCE, price_type: priceKey };
  for (const k of TRACKED) {
    const v = url.searchParams.get(k);
    if (v) metadata[k] = v.slice(0, 200);
  }

  const session = await s.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: studio.id, quantity: 1 }],
    customer_creation: "always",
    // Upsell naplaćuje sačuvanu karticu (uklj. Apple Pay, Google Pay, Link). Bancontact i iDEAL
    // bi umesto kartice ostavili SEPA nalog, pa ih ovde ne nudimo.
    excluded_payment_method_types: ["bancontact", "ideal"],
    // Čuva karticu za one-click upsell na /ponuda
    payment_intent_data: { setup_future_usage: "off_session", metadata },
    consent_collection: { terms_of_service: "required" },
    custom_text: {
      terms_of_service_acceptance: {
        message:
          "Prihvatam uslove korišćenja i saglasan sam da pristup digitalnom sadržaju počinje odmah, čime gubim pravo na odustanak od 14 dana. Razumem da povraćaj novca nije moguć.",
      },
    },
    automatic_tax: { enabled: env.AUTOMATIC_TAX === "true" },
    metadata,
    success_url: `${url.origin}/ponuda?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${url.origin}/`,
  });

  return Response.redirect(session.url, 303);
}
