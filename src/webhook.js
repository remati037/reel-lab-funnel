import { webhooks, cryptoProvider, SOURCE } from "./stripe.js";

// Eventi koje obrađujemo. Faza 2 dodaje invoice.paid, invoice.payment_failed,
// customer.subscription.deleted i charge.dispute.created.
const HANDLED = new Set(["checkout.session.completed"]);

// POST /api/stripe-webhook
export async function webhook(request, env) {
  const body = await request.text();
  let event;
  try {
    event = await webhooks.constructEventAsync(
      body,
      request.headers.get("stripe-signature"),
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider
    );
  } catch {
    return new Response("Neispravan potpis", { status: 400 });
  }

  if (!HANDLED.has(event.type)) return new Response("ignorisano");
  if (event.data.object.metadata?.source !== SOURCE) return new Response("nije iz funnela");

  const { meta } = await env.DB.prepare("INSERT OR IGNORE INTO stripe_events (id, type) VALUES (?, ?)")
    .bind(event.id, event.type)
    .run();
  if (!meta.changes) return new Response("već primljeno");

  try {
    await env.JOBS.send({ type: event.type, object_id: event.data.object.id });
  } catch (e) {
    // Ako red nije primio posao, Stripe treba da pošalje event ponovo
    await env.DB.prepare("DELETE FROM stripe_events WHERE id = ?").bind(event.id).run();
    throw e;
  }
  return new Response("ok");
}
