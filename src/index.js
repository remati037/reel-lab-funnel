import { checkout, checkoutRedirect, consent } from "./checkout.js";
import { webhook } from "./webhook.js";
import { order } from "./order.js";
import { upsell } from "./upsell.js";
import { handleBatch, reconcile } from "./jobs.js";

const routes = {
  "GET /api/checkout": checkoutRedirect,
  "POST /api/checkout": checkout,
  "POST /api/checkout/consent": consent,
  "POST /api/stripe-webhook": webhook,
  "GET /api/order": order,
  "POST /api/upsell": upsell,
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
    await reconcile(env);
  },
};
