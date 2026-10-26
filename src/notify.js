// Transakcioni mejlovi (Resend), PostHog događaji sa servera i Telegram obaveštenja

export async function sendEmail(env, { to, subject, html, text, idempotencyKey }) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_KEY}`,
      "Content-Type": "application/json",
      // Resend ne šalje isti mejl dvaput ako se posao ponovi
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({ from: env.MAIL_FROM, reply_to: env.MAIL_REPLY_TO || undefined, to: [to], subject, html, text }),
  });
  if (!r.ok) throw new Error(`Resend: ${r.status} ${await r.text()}`);
}

export async function track(env, event, { distinctId, insertId, properties }) {
  if (!env.POSTHOG_KEY) return;
  const r = await fetch("https://eu.i.posthog.com/capture/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.POSTHOG_KEY,
      event,
      distinct_id: distinctId,
      properties: { ...properties, $insert_id: insertId },
    }),
  });
  if (!r.ok) throw new Error(`PostHog: ${r.status} ${await r.text()}`);
}

export async function telegram(env, text) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return;
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
  });
  if (!r.ok) throw new Error(`Telegram: ${r.status} ${await r.text()}`);
}
