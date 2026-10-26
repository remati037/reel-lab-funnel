import { stripe, SOURCE } from "./stripe.js";

const API = "https://app.circle.so/api/admin/v2";

// Lab član je ko je u grupi koju daje Circle Paywall (postojeći članovi)
// ili u grupi koju daje upsell iz ovog funnela.
export async function isLabMember(env, email) {
  const groups = [env.CIRCLE_PAYWALL_LAB_GROUP, env.CIRCLE_LAB_GROUP];
  const found = await Promise.all(
    groups.map(async (id) => {
      const r = await fetch(`${API}/access_groups/${id}/community_member?email=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${env.CIRCLE_TOKEN}` },
      });
      if (r.status === 404) return false;
      if (!r.ok) throw new Error(`Circle grupa ${id}: ${r.status} ${await r.text()}`);
      return true;
    })
  );
  return found.some(Boolean);
}

// Plaćena sesija iz ovog funnela, ili null
export async function paidStudioSession(env, sessionId) {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId || "")) return null;
  try {
    const s = await stripe(env).checkout.sessions.retrieve(sessionId, { expand: ["payment_intent"] });
    return s.metadata?.source === SOURCE && s.payment_status === "paid" ? s : null;
  } catch {
    return null;
  }
}
