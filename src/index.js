import { checkout, checkoutRedirect, consent } from "./checkout.js";
import { webhook } from "./webhook.js";
import { order } from "./order.js";
import { upsell } from "./upsell.js";
import { lead } from "./lead.js";
import { licenseCode, licenseActivate, licenseVerify, licenseDeactivate } from "./license.js";
import { handleBatch, reconcile } from "./jobs.js";
import { labPerks } from "./labperks.js";
import { telegram } from "./notify.js";

const routes = {
  "GET /api/checkout": checkoutRedirect,
  "POST /api/checkout": checkout,
  "POST /api/checkout/consent": consent,
  "POST /api/stripe-webhook": webhook,
  "GET /api/order": order,
  "POST /api/upsell": upsell,
  "POST /api/lead": lead,
  // Licenca za AI Video Editor plugin (poziva ga plugin, ne stranice)
  "POST /api/license/code": licenseCode,
  "POST /api/license/activate": licenseActivate,
  "POST /api/license/verify": licenseVerify,
  "POST /api/license/deactivate": licenseDeactivate,
  // Javni ključevi za analitiku (PostHog, Meta Pixel), učitava ih analytics.js
  "GET /api/config.js": (_req, env) =>
    new Response(`window.STUDIO_CONFIG=${JSON.stringify({ posthogKey: env.POSTHOG_KEY || "", pixelId: env.META_PIXEL_ID || "", cfBeacon: env.CF_BEACON_TOKEN || "" })};`, {
      headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=300" },
    }),
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const handler = routes[`${request.method} ${pathname}`];
    if (!handler) return pathname.startsWith("/api/") ? new Response("Nije pronađeno", { status: 404 }) : env.ASSETS.fetch(request);

    try {
      return await handler(request, env);
    } catch (e) {
      console.error(pathname, e);
      return Response.json({ error: "Greška na serveru" }, { status: 500 });
    }
  },

  queue: handleBatch,

  async scheduled(_controller, env) {
    // Nezavisne provere: greška u jednoj ne zaustavlja drugu
    const [rec, perks] = await Promise.allSettled([reconcile(env), labPerks(env)]);
    if (rec.status === "rejected") console.error("noćna provera", rec.reason);
    if (perks.status === "rejected") {
      console.error("Lab poklon", perks.reason);
      await telegram(env, `🛑 Lab poklon: noćna provera nije uspela\n${String(perks.reason?.message ?? perks.reason).slice(0, 300)}`).catch(() => {});
    }
  },
};
