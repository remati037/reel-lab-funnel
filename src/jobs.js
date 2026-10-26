import { stripe } from "./stripe.js";
import { grantAccess, revokeAccess, createMemberIfMissing, addToAccessGroup, ensureInGroup, removeFromSpace, initialPassword } from "./circle.js";
import { addToGroup, removeFromGroup } from "./mailerlite.js";
import { createOrder, addOrderNote } from "./woo.js";
import { sendEmail, track, telegram } from "./notify.js";
import { welcomeEmail } from "./emails.js";
import { metaEvent } from "./meta.js";

const euros = (cents) => (cents / 100).toFixed(2).replace(/\.00$/, "");

// Koraci isporuke, redom. Svaki se radi tačno jednom po porudžbini; ako padne,
// red ponavlja posao i preskaču se koraci koji su već "done".
// Circle ide prvi (pristup), Woo i analitika poslednji, da ne blokiraju kupca.
const STUDIO_STEPS = [
  [
    "circle",
    async (o, env) => {
      // Zapamti da je nalog nov pre dodavanja u grupu, da ponovljeni pokušaj ne izgubi tu informaciju
      if (await createMemberIfMissing(env, o)) {
        await env.DB.prepare("UPDATE orders SET circle_new = 1 WHERE id = ?").bind(o.id).run();
        o.circle_new = 1;
      }
      await addToAccessGroup(env, o.email, env.CIRCLE_STUDIO_GROUP);
    },
  ],
  [
    "mailerlite",
    (o, env) =>
      addToGroup(env, o.email, env.ML_GROUP_STUDIO, {
        ...(o.name && { name: o.name.trim().split(/\s+/)[0] }),
        studio_datum: o.created_at.slice(0, 10),
        studio_cena: o.amount_cents / 100,
        studio_izvor: o.utm_source || "direktno",
      }),
  ],
  [
    "welcome",
    async (o, env) =>
      sendEmail(env, {
        to: o.email,
        idempotencyKey: `welcome-${o.stripe_ref}`,
        ...welcomeEmail(env, o, o.circle_new ? await initialPassword(env, o.email) : null),
      }),
  ],
  [
    "woo",
    async (o, env) => {
      const wooId = await createOrder(env, o, env.WOO_PRODUCT_STUDIO);
      await env.DB.prepare("UPDATE orders SET woo_order_id = ? WHERE id = ?").bind(wooId, o.id).run();
    },
  ],
  [
    "posthog",
    (o, env) =>
      track(env, "purchase", {
        distinctId: o.ph_id || o.email,
        insertId: o.stripe_ref,
        properties: {
          product: "studio",
          revenue: o.amount_cents / 100,
          currency: o.currency,
          price_type: o.price_type,
          utm_source: o.utm_source,
          utm_medium: o.utm_medium,
          utm_campaign: o.utm_campaign,
          utm_content: o.utm_content,
          $set: { email: o.email },
        },
      }),
  ],
  [
    "telegram",
    (o, env) =>
      telegram(env, `🎬 Studio Reel Lab: nova kupovina #${o.buyer_no}\n${o.email}\n${euros(o.amount_cents)}€ · ${o.utm_source || "direktno"}${o.utm_campaign ? " / " + o.utm_campaign : ""}`),
  ],
  [
    "meta",
    async (o, env) => {
      const session = await stripe(env).checkout.sessions.retrieve(o.stripe_ref);
      await metaEvent(env, {
        name: "Purchase",
        eventId: o.stripe_ref, // isti ID šalje Pixel sa /hvala
        email: o.email,
        meta: { ...session.metadata, url: "https://studio.aiprofit.rs/checkout" },
        value: o.amount_cents / 100,
        currency: o.currency,
        time: session.created,
      });
    },
  ],
  // Poslednji: potvrda da je Circle stvarno upisao pristup (ne blokira mejl ni Woo)
  ["circle_check", (o, env) => ensureInGroup(env, o.email, env.CIRCLE_STUDIO_GROUP, env.CIRCLE_STUDIO_SPACE)],
];

// Svaka Lab naplata: 1€ prvi mesec, pa 47€ svakog sledećeg
const LAB_STEPS = [
  ["circle", (o, env) => grantAccess(env, o, env.CIRCLE_LAB_GROUP)],
  [
    "mailerlite",
    async (o, env) => {
      await addToGroup(env, o.email, env.ML_GROUP_LAB);
      await removeFromGroup(env, o.email, env.ML_GROUP_LAB_EX);
    },
  ],
  [
    "woo",
    async (o, env) => {
      const wooId = await createOrder(env, o, env.WOO_PRODUCT_LAB);
      await env.DB.prepare("UPDATE orders SET woo_order_id = ? WHERE id = ?").bind(wooId, o.id).run();
    },
  ],
  [
    "posthog",
    (o, env) =>
      track(env, "lab_payment", {
        distinctId: o.ph_id || o.email,
        insertId: o.stripe_ref,
        properties: { product: "lab", month: o.lab_month, revenue: o.amount_cents / 100, currency: o.currency, utm_source: o.utm_source, utm_campaign: o.utm_campaign, $set: { email: o.email } },
      }),
  ],
  ["telegram", (o, env) => telegram(env, `🧪 AI Profit Lab (Studio upsell): ${o.lab_month}. mesec plaćen\n${o.email}\n${euros(o.amount_cents)}€`)],
  ["circle_check", (o, env) => ensureInGroup(env, o.email, env.CIRCLE_LAB_GROUP)],
];

// Pretplata otkazana ili ugašena posle neuspelih naplata
const LAB_CANCEL_STEPS = [
  ["circle", (c, env) => revokeAccess(env, c.email, env.CIRCLE_LAB_GROUP)],
  [
    "mailerlite",
    async (c, env) => {
      await removeFromGroup(env, c.email, env.ML_GROUP_LAB);
      await addToGroup(env, c.email, env.ML_GROUP_LAB_EX);
    },
  ],
  ["woo", (c, env) => c.lastWooOrder && addOrderNote(env, c.lastWooOrder, `Pretplata otkazana (${c.subscriptionId}).`)],
  ["posthog", (c, env) => track(env, "lab_canceled", { distinctId: c.email, insertId: `${c.subscriptionId}-canceled`, properties: { months_paid: c.monthsPaid } })],
  ["telegram", (c, env) => telegram(env, `❌ AI Profit Lab (Studio upsell) otkazan\n${c.email}\nplaćenih meseci: ${c.monthsPaid}`)],
];

// Isto kao max_retries u wrangler.jsonc (+1 za prvi pokušaj)
const MAX_ATTEMPTS = 6;

export async function handleBatch(batch, env) {
  for (const msg of batch.messages) {
    try {
      await runJob(msg.body, env);
      msg.ack();
    } catch (e) {
      console.error("posao nije uspeo", msg.body, e);
      // Posle poslednjeg pokušaja posao ide u studio-jobs-dlq, pa javljamo da treba ručno da se pogleda
      if (msg.attempts >= MAX_ATTEMPTS)
        await telegram(env, `🛑 Isporuka zapela posle ${msg.attempts} pokušaja\n${msg.body.type} ${msg.body.object_id}\n${String(e?.message ?? e).slice(0, 300)}`).catch(() => {});
      msg.retry({ delaySeconds: 30 * msg.attempts });
    }
  }
}

export async function runJob(job, env) {
  switch (job.type) {
    case "checkout.session.completed":
      return studioPurchase(job.object_id, env);
    case "invoice.paid":
      return labPayment(job.object_id, env);
    case "invoice.payment_failed":
      return labPaymentFailed(job.object_id, env);
    case "customer.subscription.deleted":
      return labCanceled(job.object_id, env);
    case "charge.dispute.created":
      return dispute(job.object_id, env);
  }
  console.warn("nepoznat posao", job);
}

async function studioPurchase(sessionId, env) {
  const session = await stripe(env).checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") return;

  const order = await saveStudioOrder(session, env);
  await runSteps(order.stripe_ref, order, STUDIO_STEPS, env);
}

async function saveStudioOrder(session, env) {
  const m = session.metadata || {};

  // buyer_no (redni broj kupca) se računa u istom upitu, pa dva istovremena kupca ne dobiju isti broj
  await env.DB.prepare(
    `INSERT OR IGNORE INTO orders
       (kind, stripe_ref, payment_intent, customer_id, email, name, amount_cents, currency, price_type, buyer_no,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, ph_id)
     VALUES ('studio', ?, ?, ?, ?, ?, ?, ?, ?, (SELECT COUNT(*) + 1 FROM orders WHERE kind = 'studio'),
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

async function labPayment(invoiceId, env) {
  const s = stripe(env);
  const inv = await s.invoices.retrieve(invoiceId);
  if (inv.status !== "paid") return;
  const sub = await s.subscriptions.retrieve(inv.parent.subscription_details.subscription);
  const m = sub.metadata;

  await env.DB.prepare(
    `INSERT OR IGNORE INTO orders
       (kind, stripe_ref, customer_id, subscription_id, email, name, amount_cents, currency, price_type, lab_month,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term, ph_id)
     VALUES ('lab', ?, ?, ?, ?, ?, ?, ?, 'lab_monthly', (SELECT COUNT(*) + 1 FROM orders WHERE kind = 'lab' AND subscription_id = ?),
        ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      inv.id,
      inv.customer,
      sub.id,
      inv.customer_email.toLowerCase(),
      inv.customer_name,
      inv.amount_paid,
      inv.currency,
      sub.id,
      m.utm_source ?? null,
      m.utm_medium ?? null,
      m.utm_campaign ?? null,
      m.utm_content ?? null,
      m.utm_term ?? null,
      m.ph_id ?? null
    )
    .run();
  // Upsell posle 3DS potvrde postaje uspešan tek ovde
  await env.DB.prepare("UPDATE upsells SET status = 'succeeded', updated_at = datetime('now') WHERE subscription_id = ?").bind(sub.id).run();

  const order = await env.DB.prepare("SELECT * FROM orders WHERE stripe_ref = ?").bind(inv.id).first();
  await runSteps(order.stripe_ref, order, LAB_STEPS, env);
}

async function labPaymentFailed(invoiceId, env) {
  const inv = await stripe(env).invoices.retrieve(invoiceId);
  // Prvu naplatu od 1€ rešava /ponuda (odbijena kartica), ovde su samo mesečne
  if (inv.billing_reason === "subscription_create") return;
  const ref = `${inv.id}-failed-${inv.attempt_count}`;
  await runSteps(ref, inv, [
    ["posthog", (i, env) => track(env, "lab_payment_failed", { distinctId: i.customer_email, insertId: ref, properties: { attempt: i.attempt_count } })],
    ["telegram", (i, env) => telegram(env, `⚠️ Lab naplata nije prošla (pokušaj ${i.attempt_count})\n${i.customer_email}\n${euros(i.amount_due)}€. Stripe pokušava ponovo.`)],
  ], env);
}

async function labCanceled(subscriptionId, env) {
  const s = stripe(env);
  const sub = await s.subscriptions.retrieve(subscriptionId);
  const customer = await s.customers.retrieve(sub.customer);
  const paid = await env.DB.prepare(
    "SELECT COUNT(*) AS n, MAX(woo_order_id) AS last_woo FROM orders WHERE kind = 'lab' AND subscription_id = ?"
  )
    .bind(sub.id)
    .first();
  const ctx = { email: customer.email.toLowerCase(), subscriptionId: sub.id, monthsPaid: paid.n, lastWooOrder: paid.last_woo };
  await runSteps(`${sub.id}-canceled`, ctx, LAB_CANCEL_STEPS, env);
}

// Chargeback za Studio: pristup Studiju se gasi, Lab ostaje
async function dispute(disputeId, env) {
  const s = stripe(env);
  const d = await s.disputes.retrieve(disputeId);
  const order = await env.DB.prepare("SELECT * FROM orders WHERE payment_intent = ? AND kind = 'studio'").bind(d.payment_intent).first();
  if (!order) return; // nije Studio kupovina iz ovog funnela

  await runSteps(d.id, order, [
    ["status", (o, env) => env.DB.prepare("UPDATE orders SET status = 'disputed' WHERE id = ?").bind(o.id).run()],
    [
      "circle",
      async (o, env) => {
        await revokeAccess(env, o.email, env.CIRCLE_STUDIO_GROUP);
        // i direktan upis u prostor, ako ga je rezerva napravila
        await removeFromSpace(env, o.email, env.CIRCLE_STUDIO_SPACE);
      },
    ],
    ["woo", (o, env) => o.woo_order_id && addOrderNote(env, o.woo_order_id, `Chargeback (${d.id}, razlog: ${d.reason}). Pristup Studiju ugašen.`)],
    ["posthog", (o, env) => track(env, "chargeback", { distinctId: o.ph_id || o.email, insertId: d.id, properties: { reason: d.reason, amount: d.amount / 100 } })],
    ["telegram", (o, env) => telegram(env, `🚨 Chargeback za Studio\n${o.email}\n${euros(d.amount)}€, razlog: ${d.reason}. Pristup Studiju ugašen, Lab ostaje.`)],
  ], env);
}

// Koraci su vezani za Stripe referencu: svaki se radi tačno jednom
async function runSteps(ref, ctx, steps, env) {
  const { results } = await env.DB.prepare("SELECT step FROM steps WHERE ref = ? AND status = 'done'").bind(ref).all();
  const done = new Set(results.map((r) => r.step));

  for (const [name, fn] of steps) {
    if (done.has(name)) continue;
    try {
      await fn(ctx, env);
      await saveStep(env, ref, name, "done", null);
    } catch (e) {
      await saveStep(env, ref, name, "failed", String(e?.message ?? e));
      throw e;
    }
  }
}

function saveStep(env, ref, step, status, error) {
  return env.DB.prepare(
    `INSERT INTO steps (ref, step, status, attempts, last_error) VALUES (?, ?, ?, 1, ?)
     ON CONFLICT (ref, step) DO UPDATE SET
       status = excluded.status, attempts = attempts + 1, last_error = excluded.last_error, updated_at = datetime('now')`
  )
    .bind(ref, step, status, error)
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
