// Lični rok iz nurture mejlova: potpisan link /checkout?ponuda=TOKEN daje cenu studio_lead (97€)
// samo toj osobi i samo do roka. Token = base64url(mejl|rok) + "." + HMAC, pa ne može da se izmisli.

const enc = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function sign(env, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(env.OFFER_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)))).slice(0, 22);
}

export async function createOffer(env, email, until) {
  const data = `${email.toLowerCase()}|${Math.floor(until / 1000)}`;
  return `${b64url(enc.encode(data))}.${await sign(env, data)}`;
}

// { email, until } ako je token ispravan i rok nije prošao, inače null
export async function readOffer(env, token) {
  if (!env.OFFER_SECRET || typeof token !== "string" || !token.includes(".")) return null;
  try {
    const [body, sig] = token.split(".");
    const data = new TextDecoder().decode(fromB64url(body));
    if ((await sign(env, data)) !== sig) return null;
    const [email, exp] = data.split("|");
    const until = Number(exp) * 1000;
    return until > Date.now() ? { email, until } : null;
  } catch {
    return null;
  }
}
