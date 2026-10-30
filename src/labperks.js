import { stripe } from "./stripe.js";
import { telegram } from "./notify.js";

// AI Video Editor besplatno za Lab članove: aktivna pretplata i 3+ plaćene naplate (prvi mesec od 1€ se računa),
// ili aktivna kvartalna/godišnja pretplata. Proverava se svake noći (cron). Licenca ostaje i ako kasnije otkažu Lab.
// Lab pretplate su sve Stripe pretplate na proizvod iz LAB_PRODUCT_IDS, a ako nije zadat, na proizvod čije ime
// sadrži "Profit Lab" ili "Webinar Ponuda" (i funnel upsell i Circle Paywall, jer su na istom Stripe nalogu).
// LAB_PERKS: "live" dodeljuje, "dry" samo javi na Telegram koga bi dodao, sve ostalo isključuje proveru.

const MIN_PAID = 3;
const DAY = 86400;
// Treća mesečna naplata stiže najranije ~2 meseca posle početka, mlađe pretplate se ni ne proveravaju
const MIN_AGE = 55 * DAY;
const ACTIVE = new Set(["active", "past_due"]);

const isLong = ({ interval, interval_count }) => interval === "year" || (interval === "month" && interval_count >= 3);

async function labProducts(s, env) {
  const ids = String(env.LAB_PRODUCT_IDS || "").split(",").map((x) => x.trim()).filter(Boolean);
  const lab = new Map();
  const all = new Map();
  for await (const p of s.products.list({ limit: 100 })) {
    all.set(p.id, p.name);
    if (ids.length ? ids.includes(p.id) : /profit lab|webinar ponuda/i.test(p.name)) lab.set(p.id, p.name);
  }
  return { lab, all };
}

// Mejlovi koji već imaju licencu: kupili AI Video Editor ili su na listi (ručno ili ranije iz ove provere)
async function licensed(env) {
  const { results } = await env.DB.prepare(
    "SELECT email FROM orders WHERE kind = 'studio' AND status = 'paid' UNION SELECT email FROM license_grants"
  ).all();
  return new Set(results.map((r) => r.email));
}

async function paidCount(s, subs) {
  let n = 0;
  for (const sub of subs) {
    for await (const inv of s.invoices.list({ subscription: sub.id, status: "paid", limit: 100 })) {
      if (inv.amount_paid > 0 && ++n >= MIN_PAID) return n;
    }
  }
  return n;
}

// Vraća [{ email, reason }] za Lab članove koji ispunjavaju uslov, a još nemaju licencu
export async function findLabPerks(env) {
  const s = stripe(env);
  const { lab: products, all } = await labProducts(s, env);
  if (!products.size) throw new Error("Nema Lab proizvoda u Stripe-u (LAB_PRODUCT_IDS ili ime sa 'Profit Lab')");

  // Sve Lab pretplate po mejlu, i ugašene, da se računaju i ranije plaćeni meseci
  const byEmail = new Map();
  const others = new Map(); // ostali proizvodi sa aktivnim pretplatama, da se u probnom režimu vidi ako je neki Lab promašen
  for await (const sub of s.subscriptions.list({ status: "all", limit: 100, expand: ["data.customer"] })) {
    const item = sub.items.data.find((i) => products.has(i.price.product));
    if (!item && ACTIVE.has(sub.status))
      for (const i of sub.items.data) others.set(i.price.product, (others.get(i.price.product) || 0) + 1);
    const email = sub.customer?.email?.trim().toLowerCase();
    if (!item || !email) continue;
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email).push({ id: sub.id, status: sub.status, start: sub.start_date, recurring: item.price.recurring });
  }

  const have = await licensed(env);
  const now = Math.floor(Date.now() / 1000);
  const perks = [];
  for (const [email, subs] of byEmail) {
    const active = subs.filter((x) => ACTIVE.has(x.status));
    if (!active.length || have.has(email)) continue;
    if (active.some((x) => x.status === "active" && isLong(x.recurring))) {
      perks.push({ email, reason: active.find((x) => isLong(x.recurring)).recurring.interval === "year" ? "godišnja" : "kvartalna" });
      continue;
    }
    if (now - Math.min(...subs.map((x) => x.start)) < MIN_AGE) continue;
    if ((await paidCount(s, subs)) >= MIN_PAID) perks.push({ email, reason: `${MIN_PAID}+ meseca` });
  }
  return {
    perks,
    products: [...products.values()],
    members: byEmail.size,
    others: [...others].map(([id, n]) => `${all.get(id) || id} (${id}): ${n}`),
  };
}

export async function labPerks(env) {
  if (env.LAB_PERKS !== "live" && env.LAB_PERKS !== "dry") return;
  const { perks, products, members, others } = await findLabPerks(env);

  if (env.LAB_PERKS === "dry") {
    const list = perks.map((p) => `${p.email} (${p.reason})`).join("\n");
    await telegram(
      env,
      `🧪 Lab poklon, probni režim (ništa nije dodato)\nProizvodi: ${products.join(", ")}\nLab mejlova u Stripe-u: ${members}\nOstale aktivne pretplate: ${others.join("; ") || "nema"}\nDobili bi AI Video Editor: ${perks.length}${list ? "\n\n" + list : ""}`.slice(0, 4000)
    );
    return perks;
  }

  // Dodela ide kroz red (koraci se rade tačno jednom, greške se ponavljaju)
  for (const p of perks) await env.JOBS.send({ type: "lab.perk", object_id: p.email, reason: p.reason });
  return perks;
}
