// WooCommerce na vladsdigital.com služi samo kao spisak porudžbina. Ništa ne naplaćuje.
// Porudžbine su gostujuće (bez Woo naloga kupca) i nose meta studio_funnel=1,
// po kojoj snippet na sajtu gasi Woo mejlove kupcu (wordpress/studio-funnel-tihi-mejlovi.php).

async function woo(env, method, path, body) {
  const r = await fetch(`${env.WOO_URL}/wp-json/wc/v3${path}`, {
    method,
    headers: { Authorization: "Basic " + btoa(`${env.WOO_KEY}:${env.WOO_SECRET}`), "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Woo ${method} ${path}: ${r.status} ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

export async function createOrder(env, order, productId) {
  const [first, ...rest] = (order.name || "").trim().split(/\s+/);
  const meta = { studio_funnel: "1", stripe_ref: order.stripe_ref };
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) if (order[k]) meta[k] = order[k];

  const created = await woo(env, "POST", "/orders", {
    status: "completed",
    set_paid: true,
    currency: order.currency.toUpperCase(),
    payment_method: "stripe",
    payment_method_title: "Stripe (Studio funnel)",
    transaction_id: order.payment_intent || order.stripe_ref,
    billing: { first_name: first || "", last_name: rest.join(" "), email: order.email },
    line_items: [{ product_id: Number(productId), quantity: 1, total: (order.amount_cents / 100).toFixed(2) }],
    meta_data: Object.entries(meta).map(([key, value]) => ({ key, value })),
  });
  return created.id;
}

export function addOrderNote(env, wooOrderId, note) {
  return woo(env, "POST", `/orders/${wooOrderId}/notes`, { note, customer_note: false });
}

export function findProductBySku(env, sku) {
  return woo(env, "GET", `/products?sku=${encodeURIComponent(sku)}&status=any`).then((list) => list[0] ?? null);
}

export function createProduct(env, product) {
  return woo(env, "POST", "/products", product);
}
