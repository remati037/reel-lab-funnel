const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const LOGIN_URL = "https://www.aiprofit.rs/sign_in";
const RESET_URL = "https://login.circle.so/users/password/new?request_host=www.aiprofit.rs";

// Jedan mejl sa svim što treba za ulazak. password je null kad kupac već ima Circle nalog.
export function welcomeEmail(env, order, password) {
  const firstName = (order.name || "").trim().split(/\s+/)[0];
  const hi = firstName ? `Ćao ${firstName},` : "Ćao,";
  const url = env.CIRCLE_STUDIO_URL;

  const loginText = password
    ? `Tvoji podaci za prijavu na aiprofit.rs:
Mejl: ${order.email}
Lozinka: ${password}
(lozinku možeš da promeniš u svom profilu)`
    : `Prijavi se na aiprofit.rs svojim postojećim nalogom (mejl ${order.email}). Zaboravio si lozinku? ${RESET_URL}`;

  const loginHtml = password
    ? `<table style="border-collapse:collapse;margin:8px 0 4px;font-size:15px">
<tr><td style="padding:4px 14px 4px 0;color:#666">Mejl</td><td style="padding:4px 0"><b>${esc(order.email)}</b></td></tr>
<tr><td style="padding:4px 14px 4px 0;color:#666">Lozinka</td><td style="padding:4px 0;font-family:Menlo,Consolas,monospace"><b>${esc(password)}</b></td></tr>
</table>
<p style="font-size:14px;color:#666;margin-top:4px">Lozinku možeš da promeniš u svom profilu.</p>`
    : `<p>Prijavi se na aiprofit.rs svojim postojećim nalogom (mejl <b>${esc(order.email)}</b>). Zaboravio si lozinku? <a href="${RESET_URL}">Napravi novu</a>.</p>`;

  const text = `${hi}

uplata je prošla i tvoj AI Video Editor je otključan.

1. Otvori kurs: ${url}
2. ${loginText}
3. Prati lekciju za instalaciju i nalepi komandu. Prvi rils ti je 10 minuta daleko.

Kurs je u zajednici AI Profit Lab na aiprofit.rs, gde su i moji ostali programi.

Zapelo je negde? Samo odgovori na ovaj mejl.

Vidimo se unutra!`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1a1a1a;max-width:560px">
<p>${esc(hi)}</p>
<p>uplata je prošla i tvoj <b>AI Video Editor</b> je otključan.</p>
<p style="margin:24px 0"><a href="${esc(url)}" style="background:#ff5a1f;color:#fff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:600;display:inline-block">Otvori AI Video Editor kurs</a></p>
<p style="margin-bottom:4px"><b>Prijava</b> (<a href="${LOGIN_URL}">www.aiprofit.rs</a>)</p>
${loginHtml}
<p><b>Prvi rils:</b> u kursu prati lekciju za instalaciju i nalepi komandu. Prvi rils ti je 10 minuta daleko.</p>
<p style="font-size:14px;color:#666">Kurs je u zajednici AI Profit Lab na aiprofit.rs, gde su i moji ostali programi.</p>
<p>Zapelo je negde? Samo odgovori na ovaj mejl.</p>
<p>Vidimo se unutra!</p>
</div>`;

  return { subject: "Tvoj AI Video Editor je otključan: pristup i lozinka", text, html };
}

// Kod za aktivaciju AI Video Editora na računaru (/api/license/code)
export function licenseCodeEmail(code) {
  const text = `Tvoj kod za AI Video Editor: ${code}

Ukucaj ga u Claude-u, tamo gde te AI Video Editor pita za kod. Važi 15 minuta.

Nisi ti tražio kod? Samo ignoriši ovaj mejl, bez koda niko ne može da aktivira AI Video Editor na tvoj mejl.`;

  const html = `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1a1a1a;max-width:560px">
<p>Tvoj kod za <b>AI Video Editor</b>:</p>
<p style="font-family:Menlo,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>
<p>Ukucaj ga u Claude-u, tamo gde te AI Video Editor pita za kod. Važi 15 minuta.</p>
<p style="font-size:14px;color:#666">Nisi ti tražio kod? Samo ignoriši ovaj mejl, bez koda niko ne može da aktivira AI Video Editor na tvoj mejl.</p>
</div>`;

  return { subject: `${code} je tvoj kod za AI Video Editor`, text, html };
}
