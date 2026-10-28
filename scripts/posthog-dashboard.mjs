// Pravi PostHog dashboard "Studio Reel Lab: funnel i prihod" sa grafikonima iz ANALITIKA.md.
//   node scripts/posthog-dashboard.mjs
// Čita POSTHOG_PERSONAL_KEY iz .dev.vars (scope: insight write, dashboard write, project read).
// Ako dashboard sa tim imenom postoji, ne pravi ga ponovo.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.dev.vars", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()])
);
const API = "https://eu.posthog.com/api/projects/@current";
const NAME = "Studio Reel Lab: funnel i prihod";

async function ph(method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${env.POSTHOG_PERSONAL_KEY}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`PostHog ${method} ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

const ev = (event, extra = {}) => ({ kind: "EventsNode", event, name: event, ...extra });
const landing = ev("$pageview", { custom_name: "Poseta landinga", properties: [{ key: "$pathname", value: "/", operator: "exact", type: "event" }] });
const bySource = { breakdownFilter: { breakdown: "utm_source", breakdown_type: "event" } };
const viz = (source) => ({ kind: "InsightVizNode", source });

const INSIGHTS = [
  {
    name: "Pregled po danu: posetioci, prijave, kupovine",
    description: "Jedinstveni posetioci landinga, lead-ovi sa /besplatno i kupovine Studija.",
    query: viz({
      kind: "TrendsQuery",
      series: [{ ...landing, math: "dau" }, ev("lead", { custom_name: "Lead (besplatni skill)" }), ev("purchase", { custom_name: "Kupovine" })],
      interval: "day",
      dateRange: { date_from: "-30d" },
    }),
  },
  {
    name: "Glavni funnel: poseta → kupovina → Lab",
    description: "Landing → klik na dugme → checkout → plaćeno → uzeo Lab. Prozor 7 dana, po izvoru (utm_source).",
    query: viz({
      kind: "FunnelsQuery",
      series: [landing, ev("cta_click", { custom_name: "Klik na dugme" }), ev("checkout_view", { custom_name: "Otvorio checkout" }), ev("purchase", { custom_name: "Platio Studio" }), ev("upsell_succeeded", { custom_name: "Uzeo Lab za 1€" })],
      funnelsFilter: { funnelWindowInterval: 7, funnelWindowIntervalUnit: "day" },
      dateRange: { date_from: "-30d" },
      ...bySource,
    }),
  },
  {
    name: "Prihod po izvoru (€)",
    description: "Studio + Lab naplate, zbir revenue, po utm_source. Promeni breakdown na utm_content da vidiš koji rils ili oglas.",
    query: viz({
      kind: "TrendsQuery",
      series: [ev("purchase", { custom_name: "Studio €", math: "sum", math_property: "revenue" }), ev("lab_payment", { custom_name: "Lab €", math: "sum", math_property: "revenue" })],
      trendsFilter: { display: "ActionsBarValue" },
      dateRange: { date_from: "-30d" },
      ...bySource,
    }),
  },
  {
    name: "Prihod po rilsu ili oglasu (utm_content)",
    description: "Kupovine Studija po utm_content: koji konkretan rils ili oglas je doneo novac.",
    query: viz({
      kind: "TrendsQuery",
      series: [ev("purchase", { custom_name: "Studio €", math: "sum", math_property: "revenue" })],
      trendsFilter: { display: "ActionsBarValue" },
      dateRange: { date_from: "-30d" },
      breakdownFilter: { breakdown: "utm_content", breakdown_type: "event" },
    }),
  },
  {
    name: "Upsell: kupac Studija → Lab",
    description: "Koliko kupaca Studija uzme AI Profit Lab za 1€.",
    query: viz({
      kind: "FunnelsQuery",
      series: [ev("purchase", { custom_name: "Platio Studio" }), ev("upsell_succeeded", { custom_name: "Uzeo Lab" })],
      funnelsFilter: { funnelWindowInterval: 1, funnelWindowIntervalUnit: "day" },
      dateRange: { date_from: "-30d" },
    }),
  },
  {
    name: "Lab zadržavanje po mesecima",
    description: "Broj Lab naplata po mesecu pretplate (1 = prvi mesec 1€, 2 = prva naplata 57€...). Odnos 2 i 1 je zadržavanje.",
    query: viz({
      kind: "TrendsQuery",
      series: [ev("lab_payment", { custom_name: "Lab naplate" })],
      trendsFilter: { display: "ActionsBarValue" },
      dateRange: { date_from: "-180d" },
      breakdownFilter: { breakdown: "month", breakdown_type: "event" },
    }),
  },
  {
    name: "Lead → kupac (14 dana)",
    description: "Koliko prijava za besplatni skill postane kupac u 14 dana.",
    query: viz({
      kind: "FunnelsQuery",
      series: [ev("lead", { custom_name: "Prijava za skill" }), ev("purchase", { custom_name: "Kupio Studio" })],
      funnelsFilter: { funnelWindowInterval: 14, funnelWindowIntervalUnit: "day" },
      dateRange: { date_from: "-90d" },
    }),
  },
  {
    name: "Otkazivanja i neuspele Lab naplate",
    query: viz({
      kind: "TrendsQuery",
      series: [ev("lab_canceled", { custom_name: "Otkazali Lab" }), ev("lab_payment_failed", { custom_name: "Neuspela naplata" }), ev("chargeback", { custom_name: "Chargeback" })],
      interval: "week",
      dateRange: { date_from: "-90d" },
    }),
  },
  {
    name: "Checkout greške",
    description: "Poruke koje je kupac video kad kartica nije prošla.",
    query: viz({
      kind: "TrendsQuery",
      series: [ev("checkout_error", { custom_name: "Greška pri plaćanju" })],
      trendsFilter: { display: "ActionsBarValue" },
      dateRange: { date_from: "-30d" },
      breakdownFilter: { breakdown: "message", breakdown_type: "event" },
    }),
  },
  {
    name: "Gde ljudi klikću i koliko skroluju",
    query: viz({
      kind: "TrendsQuery",
      series: [ev("cta_click", { custom_name: "Klikovi po sekciji" })],
      trendsFilter: { display: "ActionsBarValue" },
      dateRange: { date_from: "-30d" },
      breakdownFilter: { breakdown: "section", breakdown_type: "event" },
    }),
  },
  {
    name: "Kolačići: prihvatam / samo neophodni",
    query: viz({
      kind: "TrendsQuery",
      series: [ev("cookie_choice", { custom_name: "Izbor" })],
      trendsFilter: { display: "ActionsPie" },
      dateRange: { date_from: "-30d" },
      breakdownFilter: { breakdown: "choice", breakdown_type: "event" },
    }),
  },
];

const existing = await ph("GET", `/dashboards/?limit=200`);
const found = existing.results.find((d) => d.name === NAME && !d.deleted);
if (found) {
  console.log(`Dashboard već postoji: https://eu.posthog.com/project/${found.team_id ?? ""}/dashboard/${found.id}`);
  process.exit(0);
}

const dash = await ph("POST", "/dashboards/", {
  name: NAME,
  description: "Posete, funnel do kupovine, prihod po izvoru i rilsu, upsell i zadržavanje u Lab-u. Vidi ANALITIKA.md.",
  pinned: true,
});
for (const ins of INSIGHTS) {
  await ph("POST", "/insights/", { ...ins, dashboards: [dash.id], saved: true });
  console.log(`  + ${ins.name}`);
}
const project = await ph("GET", "/");
console.log(`\nDashboard: https://eu.posthog.com/project/${project.id}/dashboard/${dash.id}`);
