import { checkout } from "./checkout.js";
import { webhook } from "./webhook.js";
import { order } from "./order.js";
import { handleBatch, reconcile } from "./jobs.js";

const routes = {
  "GET /api/checkout": checkout,
  "POST /api/stripe-webhook": webhook,
  "GET /api/order": order,
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
