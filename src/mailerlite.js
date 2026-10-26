const API = "https://connect.mailerlite.com/api";

async function ml(env, method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${env.MAILERLITE_TOKEN}`, "Content-Type": "application/json", Accept: "application/json" },
    body: body && JSON.stringify(body),
  });
  if (r.status === 404 && method === "DELETE") return null; // već nije u grupi
  if (!r.ok) throw new Error(`MailerLite ${method} ${path}: ${r.status} ${await r.text()}`);
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
