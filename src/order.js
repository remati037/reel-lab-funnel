import { isLabMember, paidStudioSession } from "./lab.js";
import { stripe } from "./stripe.js";

// GET /api/order?session_id=  → šta ponuda i hvala stranica treba da prikažu
//   ready:  webhook je obradio kupovinu
//   lab:    uzeo je Lab u ovom funnelu
//   labClan: već je bio Lab član (ponuda se preskače)
export async function order(request, env) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  const session = await paidStudioSession(env, sessionId);
  if (!session) return Response.json({ error: "Nepoznata kupovina" }, { status: 404 });

  const row = await env.DB.prepare("SELECT amount_cents, currency FROM orders WHERE stripe_ref = ? AND kind = 'studio'").bind(session.id).first();
  const upsell = await env.DB.prepare("SELECT status, subscription_id FROM upsells WHERE session_id = ?").bind(session.id).first();

  let lab = upsell?.status === "succeeded";
  // Posle 3DS potvrde webhook ponekad kasni par sekundi: pitamo Stripe direktno
  if (upsell?.status === "requires_action" && upsell.subscription_id) {
    lab = (await stripe(env).subscriptions.retrieve(upsell.subscription_id)).status === "active";
  }

  return Response.json({
    ready: !!row,
    ...(row && { amount: row.amount_cents / 100, currency: row.currency.toUpperCase() }),
    lab,
    labClan: !lab && (await isLabMember(env, session.customer_details.email.toLowerCase())),
  });
}
