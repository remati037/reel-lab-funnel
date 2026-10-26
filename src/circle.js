const API = "https://app.circle.so/api/admin/v2";

async function circle(env, method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${env.CIRCLE_TOKEN}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  if (r.status === 404 && method === "GET") return null;
  if (!r.ok) throw new Error(`Circle ${method} ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

export function findMember(env, email) {
  return circle(env, "GET", `/community_members/search?email=${encodeURIComponent(email)}`);
}

// Novi član dobija Circle pozivnicu na mejl, postojeći samo dobija pristup grupi
export async function grantAccess(env, { email, name }, groupId) {
  if (!(await findMember(env, email))) await circle(env, "POST", "/community_members", { email, ...(name && { name }) });
  await circle(env, "POST", `/access_groups/${groupId}/community_members`, { email });
}

export async function revokeAccess(env, email, groupId) {
  await circle(env, "DELETE", `/access_groups/${groupId}/community_members?email=${encodeURIComponent(email)}`);
}
