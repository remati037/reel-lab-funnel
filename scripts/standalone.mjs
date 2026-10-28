// Pravi public/landing-standalone.html iz public/index.html: landing u jednom fajlu, za deljenje.
// CSS i JS su ugrađeni, nema analitike ni kolačića, a dugmad vode na #cena umesto na checkout.
// Pokreni posle svake izmene landinga: npm run standalone
import { readFileSync, writeFileSync } from "node:fs";

const read = (f) => readFileSync(new URL(`../public/${f}`, import.meta.url), "utf8");

const swap = (text, from, to) => {
  if (!text.includes(from)) throw new Error(`Nema u fajlu: ${from}`);
  return text.replace(from, to);
};

let js = read("script.js");
js = swap(js, '  // Svako dugme vodi na našu checkout stranicu. UTM parametri sa landinga idu dalje.\n  checkoutUrl: "/checkout",', '  // Standalone ne vodi kroz funnel: dugmad skroluju do cene.\n  checkoutUrl: "#cena",');
js = swap(js, "(a.href = CONFIG.checkoutUrl + location.search)", "(a.href = CONFIG.checkoutUrl)");

let html = read("index.html");
html = swap(html, '  <link rel="stylesheet" href="styles.css">\n', `  <style>\n${read("styles.css")}  </style>\n`);
for (const tag of [
  '  <script src="/api/config.js" defer></script>\n',
  '  <script src="https://cdn.jsdelivr.net/npm/posthog-js@1.438.7/dist/array.js" defer></script>\n',
  '  <script src="/analytics.js" defer></script>\n',
]) html = swap(html, tag, "");
html = swap(html, ' · <a href="#" data-cookie-settings>Kolačići</a>', "");
html = swap(html, '<script src="script.js"></script>', `<script>\n${js}</script>`);

writeFileSync(new URL("../public/landing-standalone.html", import.meta.url), html);
console.log("public/landing-standalone.html je napravljen iz index.html");
