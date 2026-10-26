import { stripe, SOURCE } from "./stripe.js";
import { isLabMember, paidStudioSession } from "./lab.js";
import { track } from "./notify.js";

const OFFER_HOURS = 24;

// POST /api/upsell { session_id } → { status: succeeded | requires_action | declined | already | processing }
// Pravi Lab pretplatu (1€ prvi mesec, pa 47€) karticom sačuvanom u checkout-u, bez ponovnog unosa.
export async function upsell(request, env) {
  const { session_id } = await request.json().catch(() => ({}));
  const session = await paidStudioSession(env, session_id);
  if (!session) return Response.json({ status: "declined", error: "Nepoznata kupovina" }, { status: 400 });
  if (Date.now() / 1000 - session.created > OFFER_HOURS * 3600) return Response.json({ status: "declined", error: "Ponuda je istekla" });

  const email = session.customer_details.email.toLowerCase();
  const s = stripe(env);

  const existing = await env.DB.prepare("SELECT status, subscription_id FROM upsells WHERE session_id = ?").bind(session.id).first();
  if (existing?.status === "succeeded") return Response.json({ status: "already" });
  if (existing?.status === "requires_action") return Response.json(withKey(env, await resume(env, s, session.id, existing.subscription_id)));

  if (await isLabMember(env, email)) return Response.json({ status: "already" });

  // Jedan pokušaj u isto vreme po sesiji; posle odbijene kartice sme ponovo
  const { meta } = await env.DB.prepare(
    `INSERT INTO upsells (session_id, status, email) VALUES (?, 'processing', ?)
     ON CONFLICT (session_id) DO UPDATE SET status = 'processing', updated_at = datetime('now') WHERE upsells.status = 'declined'`
  )
    .bind(session.id, email)
    .run();
  if (!meta.changes) return Response.json({ status: "processing" });

  const { data: prices } = await s.prices.list({ lookup_keys: ["lab_monthly"], active: true });
  if (!prices[0]) throw new Error("Nema Stripe cene lab_monthly");

  const utm = Object.fromEntries(Object.entries(session.metadata).filter(([k]) => k.startsWith("utm_") || k === "ph_id"));
  let result;
  try {
    const sub = await s.subscriptions.create({
      customer: session.customer,
      items: [{ price: prices[0].id }],
      discounts: [{ coupon: "PRVI_MESEC_1E" }],
      default_payment_method: session.payment_intent.payment_method,
      payment_behavior: "allow_incomplete",
      metadata: { source: SOURCE, studio_session: session.id, ...utm },
    });
    await env.DB.prepare("UPDATE upsells SET subscription_id = ? WHERE session_id = ?").bind(sub.id, session.id).run();
    result = await outcome(s, sub);
  } catch (e) {
    console.error("upsell", e);
    result = { status: "declined" };
  }

  await env.DB.prepare("UPDATE upsells SET status = ?, updated_at = datetime('now') WHERE session_id = ?")
    .bind(result.status, session.id)
    .run();
  await track(env, `upsell_${result.status}`, {
    distinctId: session.metadata.ph_id || email,
    insertId: `upsell-${session.id}-${result.status}`,
    properties: { product: "lab", utm_source: session.metadata.utm_source, utm_campaign: session.metadata.utm_campaign },
  }).catch((e) => console.error("posthog", e));

  return Response.json(withKey(env, result));
}

// Stripe.js na stranici treba javni ključ samo za 3DS potvrdu
const withKey = (env, r) => (r.client_secret ? { ...r, publishable_key: env.STRIPE_PUBLISHABLE_KEY } : r);

// Šta je banka rekla na prvu naplatu od 1€
async function outcome(s, sub) {
  if (sub.status === "active" || sub.status === "trialing") return { status: "succeeded" };

  const invoice = await s.invoices.retrieve(sub.latest_invoice, { expand: ["payments", "confirmation_secret"] });
  const piId = invoice.payments?.data?.[0]?.payment?.payment_intent;
  const pi = piId && (await s.paymentIntents.retrieve(piId));
  if (pi?.status === "requires_action") return { status: "requires_action", client_secret: invoice.confirmation_secret.client_secret };

  // Odbijeno: nedovršena pretplata se gasi odmah, kupac može da proba ponovo
  await s.subscriptions.cancel(sub.id);
  return { status: "declined" };
}

// Kupac se vratio posle 3DS prozora (ili osvežio stranicu)
async function resume(env, s, sessionId, subscriptionId) {
  const sub = await s.subscriptions.retrieve(subscriptionId);
  const result = sub.status === "incomplete" ? await outcome(s, sub) : { status: sub.status === "active" ? "succeeded" : "declined" };
  await env.DB.prepare("UPDATE upsells SET status = ?, updated_at = datetime('now') WHERE session_id = ?").bind(result.status, sessionId).run();
  return result.status === "succeeded" ? { status: "already" } : result;
}
