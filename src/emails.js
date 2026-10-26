const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function welcomeEmail(env, order) {
  const firstName = (order.name || "").trim().split(/\s+/)[0];
  const hi = firstName ? `Ćao ${firstName},` : "Ćao,";
  const url = env.CIRCLE_STUDIO_URL;

  const text = `${hi}

uplata je prošla i tvoj Studio Reel Lab je otključan.

Tri koraka do prvog rilsa:

1. Pozivnica za Circle zajednicu AI Profit Lab stiže u posebnom mejlu za par minuta (pogledaj i Promocije i Spam). Ako već imaš Circle nalog na aiprofit.rs, prijavi se kao i do sada.
2. Otvori kurs: ${url}
3. Prati lekciju za instalaciju i nalepi komandu. Prvi rils ti je 10 minuta daleko.

Zapelo je negde? Samo odgovori na ovaj mejl.

Vidimo se unutra!`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1a1a1a;max-width:560px">
<p>${esc(hi)}</p>
<p>uplata je prošla i tvoj <b>Studio Reel Lab</b> je otključan.</p>
<p><b>Tri koraka do prvog rilsa:</b></p>
<ol style="padding-left:20px">
<li style="margin-bottom:8px">Pozivnica za Circle zajednicu <b>AI Profit Lab</b> stiže u posebnom mejlu za par minuta (pogledaj i Promocije i Spam). Ako već imaš Circle nalog na aiprofit.rs, prijavi se kao i do sada.</li>
<li style="margin-bottom:8px">Otvori kurs preko dugmeta ispod.</li>
<li>Prati lekciju za instalaciju i nalepi komandu. Prvi rils ti je 10 minuta daleko.</li>
</ol>
<p style="margin:24px 0"><a href="${esc(url)}" style="background:#ff5a1f;color:#fff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:600;display:inline-block">Otvori Studio Reel Lab kurs</a></p>
<p>Zapelo je negde? Samo odgovori na ovaj mejl.</p>
<p>Vidimo se unutra!</p>
</div>`;

  return { subject: "Tvoj Studio Reel Lab je otključan", text, html };
}
