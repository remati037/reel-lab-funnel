// Jednokratno podešavanje naloga. Pokreće se više puta bez duplikata: ono što postoji se preskače.
//   node scripts/setup.mjs stripe       proizvodi, cene i kupon u Stripe-u (test ili live, po ključu)
//   node scripts/setup.mjs woo          proizvodi sa SKU-om u WooCommerce-u
//   node scripts/setup.mjs mailerlite   grupe i polja u MailerLite-u
// Ključeve čita iz .dev.vars. Na kraju ispiše ID-jeve za wrangler.jsonc.
import { readFileSync } from "node:fs";
import Stripe from "stripe";

const env = Object.fromEntries(
  readFileSync(new URL("../.dev.vars", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);

const PRODUCT_NAME = "Studio Reel Lab";

async function setupStripe() {
  const s = new Stripe(env.STRIPE_SECRET_KEY);
  const mode = env.STRIPE_SECRET_KEY.startsWith("sk_live") ? "LIVE" : "test";
  console.log(`Stripe (${mode})`);

  const product = async (name, key) => {
    // list umesto search: search vidi nove proizvode tek posle par minuta
    for await (const p of s.products.list({ active: true, limit: 100 })) if (p.metadata.key === key) return p;
    return s.products.create({ name, metadata: { key, source: "studio" } });
  };
  const price = async (lookup_key, params) => {
    const { data } = await s.prices.list({ lookup_keys: [lookup_key] });
    if (data[0]) return console.log(`  ✓ cena ${lookup_key} postoji`), data[0];
    const p = await s.prices.create({ lookup_key, currency: "eur", ...params });
    console.log(`  + cena ${lookup_key}: ${params.unit_amount / 100}€${params.recurring ? " mesečno" : ""}`);
    return p;
  };

  const studio = await product(PRODUCT_NAME, "studio");
  await price("studio_launch", { product: studio.id, unit_amount: 6700, nickname: "Launch 67€" });
  await price("studio_regular", { product: studio.id, unit_amount: 9700, nickname: "Redovna 97€" });
  await price("studio_lead", { product: studio.id, unit_amount: 6700, nickname: "Lični rok 72h 67€" });

  const lab = await product("AI Profit Lab", "lab");
  await price("lab_monthly", { product: lab.id, unit_amount: 4700, recurring: { interval: "month" }, nickname: "Lab 47€ mesečno" });

  try {
    await s.coupons.retrieve("PRVI_MESEC_1E");
    console.log("  ✓ kupon PRVI_MESEC_1E postoji");
  } catch {
    await s.coupons.create({ id: "PRVI_MESEC_1E", name: "Prvi mesec 1€", amount_off: 4600, currency: "eur", duration: "once" });
    console.log("  + kupon PRVI_MESEC_1E (46€ popusta, prvi mesec)");
  }
}

async function setupWoo() {
  const woo = async (method, path, body) => {
    const r = await fetch(`${env.WOO_URL}/wp-json/wc/v3${path}`, {
      method,
      headers: { Authorization: "Basic " + btoa(`${env.WOO_KEY}:${env.WOO_SECRET}`), "Content-Type": "application/json" },
      body: body && JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`Woo ${method} ${path}: ${r.status} ${await r.text()}`);
    return r.json();
  };
  console.log("WooCommerce");
  const ids = {};
  for (const [sku, name, price] of [
    ["CS-STUDIO", PRODUCT_NAME, "97"],
    ["LAB-MESECNO", "AI Profit Lab (Studio upsell, mesečno)", "47"],
  ]) {
    const [found] = await woo("GET", `/products?sku=${sku}&status=any`);
    if (found) {
      ids[sku] = found.id;
      console.log(`  ✓ ${sku} postoji (#${found.id})`);
      continue;
    }
    // Privatan i sakriven: postoji samo za evidenciju, ne vidi se u prodavnici
    const p = await woo("POST", "/products", {
      name,
      sku,
      type: "simple",
      status: "private",
      catalog_visibility: "hidden",
      virtual: true,
      regular_price: price,
      description: "Prodaje se preko studio.aiprofit.rs (Stripe). Ovde je samo za evidenciju porudžbina.",
    });
    ids[sku] = p.id;
    console.log(`  + ${sku} (#${p.id})`);
  }
  console.log(`\n  "WOO_PRODUCT_STUDIO": "${ids["CS-STUDIO"]}",\n  "WOO_PRODUCT_LAB": "${ids["LAB-MESECNO"]}",`);
}

async function setupMailerLite() {
  const ml = async (method, path, body) => {
    const r = await fetch(`https://connect.mailerlite.com/api${path}`, {
      method,
      headers: { Authorization: `Bearer ${env.MAILERLITE_TOKEN}`, "Content-Type": "application/json", Accept: "application/json" },
      body: body && JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`MailerLite ${method} ${path}: ${r.status} ${await r.text()}`);
    return r.json();
  };
  console.log("MailerLite");
  const ids = {};
  for (const [key, name] of [
    ["ML_GROUP_STUDIO", "Studio Reel Lab (kupci ✅)"],
    ["ML_GROUP_LAB", "AI Profit Lab - Studio upsell (aktivni)"],
    ["ML_GROUP_LAB_EX", "AI Profit Lab - Studio upsell (otkazali)"],
    ["ML_GROUP_LEAD", "Studio Reel Lab - besplatni skill (lead)"],
  ]) {
    const { data: groups } = await ml("GET", `/groups?limit=100&filter[name]=${encodeURIComponent(name)}`);
    const found = groups.find((g) => g.name === name);
    ids[key] = found ? found.id : (await ml("POST", "/groups", { name })).data.id;
    console.log(`  ${found ? "✓" : "+"} grupa ${name}`);
  }
  const { data: fields } = await ml("GET", "/fields?limit=100");
  for (const [name, type] of [
    ["studio_datum", "date"],
    ["studio_cena", "number"],
    ["studio_izvor", "text"],
    ["studio_ponuda_link", "text"],
    ["studio_ponuda_do", "date"],
  ]) {
    if (fields.some((f) => f.key === name)) console.log(`  ✓ polje ${name}`);
    else await ml("POST", "/fields", { name, type }), console.log(`  + polje ${name}`);
  }
  console.log("\n" + Object.entries(ids).map(([k, v]) => `  "${k}": "${v}",`).join("\n"));
}

const tasks = { stripe: setupStripe, woo: setupWoo, mailerlite: setupMailerLite };
const which = process.argv.slice(2);
if (!which.length || which.some((w) => !tasks[w])) {
  console.log("Upotreba: node scripts/setup.mjs stripe|woo|mailerlite [...]");
  process.exit(1);
}
for (const w of which) await tasks[w]();
