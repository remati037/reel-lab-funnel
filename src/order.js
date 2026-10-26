// GET /api/order?session_id=  → šta hvala stranica treba da prikaže
export async function order(request, env) {
  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) return Response.json({ error: "session_id" }, { status: 400 });

  const row = await env.DB.prepare("SELECT bump, buyer_no FROM orders WHERE stripe_ref = ? AND kind = 'studio'")
    .bind(sessionId)
    .first();
  // Webhook još nije stigao: stranica pita ponovo za sekund
  if (!row) return Response.json({ ready: false });

  const upsell = await env.DB.prepare("SELECT status FROM upsells WHERE session_id = ?").bind(sessionId).first();

  return Response.json({
    ready: true,
    bump: !!row.bump,
    radionica: row.buyer_no <= Number(env.WORKSHOP_LIMIT),
    lab: upsell?.status === "succeeded",
    labClan: false, // Faza 2: provera Lab članstva preko Circle-a
  });
}
