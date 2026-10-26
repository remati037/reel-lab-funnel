const API = "https://app.circle.so/api/admin/v2";

async function circle(env, method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${env.CIRCLE_TOKEN}`, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  // GET: nema ga. DELETE: već nije u grupi. Oba su u redu.
  if (r.status === 404 && (method === "GET" || method === "DELETE")) return null;
  if (!r.ok) throw new Error(`Circle ${method} ${path}: ${r.status} ${await r.text()}`);
  return r.json();
}

export function findMember(env, email) {
  return circle(env, "GET", `/community_members/search?email=${encodeURIComponent(email)}`);
}

// Početna lozinka novog člana. Računa se iz tajnog ključa i mejla, pa se nigde ne čuva,
// a welcome mejl može da je izračuna ponovo. Circle traži veliko slovo, broj i simbol.
export async function initialPassword(env, email) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(env.CIRCLE_PASSWORD_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(email)));
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const part = [...bytes.slice(0, 6)].map((b) => abc[b % abc.length]).join("");
  return `Reel${part}!${bytes[6] % 10}`;
}

// Pravi Circle nalog ako ne postoji, bez Circle pozivnice (pristupne podatke šalje naš welcome mejl).
// Vraća true ako je nalog nov.
export async function createMemberIfMissing(env, { email, name }) {
  if (await findMember(env, email)) return false;
  const password = await initialPassword(env, email);
  await circle(env, "POST", "/community_members", { email, password, skip_invitation: true, ...(name && { name }) });
  return true;
}

// Napomena: Circle člana upisuje u grupu u pozadini, ponekad i do minut posle odgovora 201
export async function addToAccessGroup(env, email, groupId) {
  await circle(env, "POST", `/access_groups/${groupId}/community_members`, { email });
}

// Circle ponekad odgovori 201, a člana ne upiše (npr. nalog napravljen sekundu ranije još nije spreman).
// Ako ga nema u grupi, dodaje ponovo i baca grešku, pa red ponavlja proveru za 30s, 60s...
export async function ensureInGroup(env, email, groupId) {
  const inGroup = await circle(env, "GET", `/access_groups/${groupId}/community_member?email=${encodeURIComponent(email)}`);
  if (inGroup) return;
  await addToAccessGroup(env, email, groupId);
  throw new Error(`Circle još nije upisao ${email} u grupu ${groupId}, proveravam ponovo`);
}

export async function grantAccess(env, member, groupId) {
  await createMemberIfMissing(env, member);
  await addToAccessGroup(env, member.email, groupId);
}

export async function revokeAccess(env, email, groupId) {
  await circle(env, "DELETE", `/access_groups/${groupId}/community_members?email=${encodeURIComponent(email)}`);
}
