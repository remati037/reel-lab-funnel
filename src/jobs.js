import { stripe } from "./stripe.js";

// Koraci isporuke, redom. Svaki se radi tačno jednom po porudžbini; ako padne,
// red ponavlja posao i preskaču se koraci koji su već "done".
// Circle, MailerLite, welcome mejl, Woo, PostHog i obaveštenje dolaze u koracima 1.5–1.7.
const STUDIO_STEPS = [];

export async function handleBatch(batch, env) {
  for (const msg of batch.messages) {
    try {
      await runJob(msg.body, env);
      msg.ack();
    } catch (e) {
      console.error("posao nije uspeo", msg.body, e);
      msg.retry({ delaySeconds: 30 * msg.attempts });
    }
  }
}

export async function runJob(job, env) {
  if (job.type === "checkout.session.completed") return studioPurchase(job.object_id, env);
  console.warn("nepoznat posao", job);
}

async function studioPurchase(sessionId, env) {
  const session = await stripe(env).checkout.sessions.retrieve(sessionId, { expand: ["line_items.data.price"] });
  if (session.payment_status !== "paid") return;

  const order = await saveStudioOrder(session, env);
  await runSteps(order, STUDIO_STEPS, env);
}

async function saveStudioOrder(session, env) {
  const m = session.metadata || {};
  const bump = session.line_items.data.some((li) => li.price?.lookup_key === "hookpack");

  // buyer_no se računa u istom upitu, pa dva istovremena kupca ne dobiju isti broj
  await env.DB.prepare(
    `INSERT OR IGNORE INTO orders
       (kind, stripe_ref, payment_intent, customer_id, email, name, amount_cents, currency, price_type, bump, buyer_no,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, ph_id)
     VALUES ('studio', ?, ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COUNT(*) + 1 FROM orders WHERE kind = 'studio'),
        ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      session.id,
      session.payment_intent,
      session.customer,
      session.customer_details.email.toLowerCase(),
      session.customer_details.name,
      session.amount_total,
      session.currency,
      m.price_type ?? null,
      bump ? 1 : 0,
      m.utm_source ?? null,
      m.utm_medium ?? null,
      m.utm_campaign ?? null,
      m.utm_content ?? null,
      m.utm_term ?? null,
      m.fbclid ?? null,
      m.ph_id ?? null
    )
    .run();

  return env.DB.prepare("SELECT * FROM orders WHERE stripe_ref = ?").bind(session.id).first();
}

async function runSteps(order, steps, env) {
  const { results } = await env.DB.prepare("SELECT step FROM delivery_steps WHERE order_id = ? AND status = 'done'")
    .bind(order.id)
    .all();
  const done = new Set(results.map((r) => r.step));

  for (const [name, fn] of steps) {
    if (done.has(name)) continue;
    try {
      await fn(order, env);
      await saveStep(env, order.id, name, "done", null);
    } catch (e) {
      await saveStep(env, order.id, name, "failed", String(e?.message ?? e));
      throw e;
    }
  }
}

function saveStep(env, orderId, step, status, error) {
  return env.DB.prepare(
    `INSERT INTO delivery_steps (order_id, step, status, attempts, last_error) VALUES (?, ?, ?, 1, ?)
     ON CONFLICT (order_id, step) DO UPDATE SET
       status = excluded.status, attempts = attempts + 1, last_error = excluded.last_error, updated_at = datetime('now')`
  )
    .bind(orderId, step, status, error)
    .run();
}

// Noćna provera: plaćene sesije iz poslednjih 48h kojih nema u bazi idu ponovo u red
export async function reconcile(env) {
  const since = Math.floor(Date.now() / 1000) - 48 * 3600;
  const missing = [];
  for await (const s of stripe(env).checkout.sessions.list({ created: { gte: since }, status: "complete", limit: 100 })) {
    if (s.metadata?.source !== "studio" || s.payment_status !== "paid") continue;
    const row = await env.DB.prepare("SELECT 1 FROM orders WHERE stripe_ref = ?").bind(s.id).first();
    if (!row) missing.push(s.id);
  }
  for (const id of missing) await env.JOBS.send({ type: "checkout.session.completed", object_id: id });
  if (missing.length) console.warn("noćna provera dopunila", missing);
  return missing;
}
