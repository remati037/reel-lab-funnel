import { addToGroup } from "./mailerlite.js";
import { track } from "./notify.js";
import { metaEvent, clientInfo } from "./meta.js";
import { createOffer } from "./offer.js";

// Lični rok za 67€: 4 dana nurture-a + 72h ponude
const OFFER_DAYS = 7;

// POST /api/lead { email, name?, website?, eventId, params: { utm_..., ph_id, consent, fbp, fbc } }
// Prijava za besplatni skill: MailerLite grupa + lični link za ponudu, PostHog i Meta Lead.
export async function lead(request, env) {
  const body = await request.json().catch(() => ({}));
  // Zamka za botove: ljudi ne vide polje "website"
  if (body.website) return Response.json({ ok: true });

  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) return Response.json({ ok: false, error: "Upiši ispravan email." }, { status: 400 });
  const name = String(body.name || "").trim().slice(0, 60);
  const p = body.params || {};
  const origin = new URL(request.url).origin;

  const until = Date.now() + OFFER_DAYS * 86400000;
  const link = `${origin}/checkout?ponuda=${await createOffer(env, email, until)}&utm_source=mailerlite&utm_medium=email&utm_campaign=licni-rok`;

  await addToGroup(env, email, env.ML_GROUP_LEAD, {
    ...(name && { name }),
    studio_ponuda_link: link,
    studio_ponuda_do: new Date(until).toISOString().slice(0, 10),
    studio_izvor: String(p.utm_source || "direktno").slice(0, 100),
  });

  const safe = (fn) => fn().catch((e) => console.error("lead", e));
  await Promise.all([
    safe(() =>
      track(env, "lead", {
        distinctId: p.ph_id || email,
        insertId: `lead-${email}-${new Date().toISOString().slice(0, 10)}`,
        properties: { source: "besplatno", utm_source: p.utm_source, utm_campaign: p.utm_campaign, utm_content: p.utm_content, $set: { email } },
      })
    ),
    safe(() =>
      metaEvent(env, {
        name: "Lead",
        eventId: String(body.eventId || "").slice(0, 60) || undefined,
        email,
        meta: { ...p, ...clientInfo(request), url: `${origin}/besplatno` },
      })
    ),
  ]);

  return Response.json({ ok: true });
}
