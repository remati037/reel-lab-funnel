import Stripe from "stripe";

export const cryptoProvider = Stripe.createSubtleCryptoProvider();

// Provera potpisa webhook-a ne treba API ključ
export const webhooks = Stripe.webhooks;

export function stripe(env) {
  return new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
}

// Sve što funnel pravi u Stripe-u nosi source=studio. Circle Paywall naplate na istom nalogu nemaju tu oznaku.
export const SOURCE = "studio";

// Koja Studio cena važi sada. null = vrata su zatvorena.
export function currentPriceKey(env, now = Date.now()) {
  if (env.MODE === "evergreen") return "studio_regular";
  if (now < Date.parse(env.LAUNCH_UNTIL)) return "studio_launch";
  if (now < Date.parse(env.CLOSE_AT)) return "studio_regular";
  return null;
}
