const API = "https://connect.mailerlite.com/api";

async function ml(env, method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${env.MAILERLITE_TOKEN}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body && JSON.stringify(body),
  });
  if (r.status === 404 && method === "DELETE") return null; // već nije u grupi
  if (!r.ok) {
    const text = await r.text();
    // Odjavljen pretplatnik ne može ponovo da se upiše preko API-ja; ne sme da blokira isporuku
    if (r.status === 422 && text.includes("unsubscribed")) {
      console.warn(`MailerLite ${method} ${path}: odjavljen pretplatnik, preskačem`);
      return null;
    }
    throw new Error(`MailerLite ${method} ${path}: ${r.status} ${text}`);
  }
  return r.status === 204 ? null : r.json();
}

// Upsert: postojeći pretplatnik zadržava svoje grupe i polja, samo mu se dodaju naša
export function addToGroup(env, email, groupId, fields = {}) {
  return ml(env, "POST", "/subscribers", { email, fields, groups: [groupId] });
}

export async function removeFromGroup(env, email, groupId) {
  const { data } = await ml(env, "GET", `/subscribers/${encodeURIComponent(email)}`);
  await ml(env, "DELETE", `/subscribers/${data.id}/groups/${groupId}`);
}
