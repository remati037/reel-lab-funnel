/* =========================================================
   PODEŠAVANJA za /ponuda i /hvala — menjaj ovde
   ========================================================= */
const FUNNEL = {
  upsellApi: "/api/upsell",  // POST { session_id } → { status: "succeeded" | "requires_action" | "declined" | "already", client_secret?, publishable_key? }
  orderApi: "/api/order",    // GET ?session_id= → { ready: bool, lab: bool, labClan: bool }

  circleUrl: "https://www.aiprofit.rs/c/ai-video-editor", // Circle prostor kursa
  email: "podrska@vladsdigital.com",

  lab: { first: "1€", monthly: "57€", trialDays: 30 },
  // Stripe Customer Portal: otkazivanje Lab-a i promena kartice (uživo zameni test link)
  portalUrl: "https://billing.stripe.com/p/login/test_4gM7sEea56162wueiKd7q00",

};

/* ---------- zajedničko ---------- */
const params = new URLSearchParams(location.search);
const sessionId = params.get("session_id") || "";
// Pravi Stripe session_id ide na server. Test checkout (checkout.html) pravi kratak lažni ID,
// pa tada dugme "Da" samo glumi naplatu, a ?fail=1 i ?lab=... simuliraju ishode.
FUNNEL.demo = !/^cs_(test|live)_[A-Za-z0-9]{20,}$/.test(sessionId);

function fill(root = document) {
  root.querySelectorAll("[data-f]").forEach((el) => {
    const v = el.dataset.f.split(".").reduce((o, k) => (o ? o[k] : undefined), FUNNEL);
    if (v != null) el.textContent = v;
  });
  root.querySelectorAll("[data-mail]").forEach((a) => {
    a.href = "mailto:" + FUNNEL.email;
    if (!a.children.length) a.textContent = FUNNEL.email;
  });
}
fill();

// prenosi session_id na sledeću stranicu
function withSession(url, extra = {}) {
  const u = new URL(url, location.href);
  if (sessionId) u.searchParams.set("session_id", sessionId);
  Object.entries(extra).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.pathname.split("/").pop() + u.search;
}

/* =========================================================
   /ponuda — one-click upsell
   ========================================================= */
const offer = document.querySelector("[data-main]");
if (offer) {
  // datum prve naplate od 57€
  const d = new Date(Date.now() + FUNNEL.lab.trialDays * 86400000);
  const months = ["januara", "februara", "marta", "aprila", "maja", "juna", "jula", "avgusta", "septembra", "oktobra", "novembra", "decembra"];
  const dateText = `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
  document.querySelectorAll("[data-renew-date]").forEach((el) => (el.textContent = dateText));

  const no = offer.querySelector("[data-no]");
  no.href = withSession("hvala.html");
  no.addEventListener("click", () => window.studioTrack?.("upsell_declined"));
  document.addEventListener("DOMContentLoaded", () => window.studioTrack?.("upsell_viewed"));

  // Dugme "Da" ima više kopija na stranici. Dok jedna naplata traje, sva su zaključana.
  const buttons = [...document.querySelectorAll("[data-yes]")];
  let clicked = buttons[0];
  const setState = (s) => {
    buttons.forEach((b) => {
      b.disabled = s === "processing";
      b.querySelector("span").textContent = s === "processing" && b === clicked ? "Obrađujem..." : b.dataset.label;
    });
    document.querySelectorAll("[data-offer]").forEach((o) => delete o.dataset.state);
    // Poruka o grešci ide uz dugme koje je kliknuto; traka pri dnu nema mesta za nju, pa vodi na ponudu na dnu
    const box = clicked.closest("[data-offer]");
    const target = box.querySelector(".fail") ? box : offer;
    target.dataset.state = s;
    if (s === "failed" && target !== box) target.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const done = () => (location.href = withSession("hvala.html", { lab: "1" }));

  // Traka sa dugmetom pri dnu ekrana: vidi se kad hero dugme izađe sa ekrana, a ponuda na dnu još nije stigla
  const stick = document.querySelector("[data-stick]");
  if (stick && "IntersectionObserver" in window) {
    const seen = new Map();
    const watched = [document.querySelector(".offer-mini"), offer];
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target, { visible: e.isIntersecting, above: e.boundingClientRect.top < 0 }));
      const hero = seen.get(watched[0]), end = seen.get(offer);
      const on = hero && !hero.visible && hero.above && !(end && (end.visible || end.above));
      stick.classList.toggle("on", !!on);
      stick.setAttribute("aria-hidden", on ? "false" : "true");
      stick.querySelector("[data-yes]").tabIndex = on ? 0 : -1;
      document.body.classList.toggle("has-stick", !!on);
    });
    watched.forEach((el) => el && io.observe(el));
  }

  // Već je Lab član: ponuda nema smisla, ide pravo na hvala
  if (!FUNNEL.demo)
    fetch(`${FUNNEL.orderApi}?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((res) => res.labClan && location.replace(withSession("hvala.html")))
      .catch(() => {});

  buttons.forEach((b) => b.addEventListener("click", () => {
    clicked = b;
    charge();
  }));

  const charge = async () => {
    setState("processing");
    window.studioTrack?.("upsell_click", { position: clicked.dataset.yes });
    if (FUNNEL.demo) return setTimeout(() => (params.get("fail") === "1" ? setState("failed") : done()), 900);
    try {
      const r = await fetch(FUNNEL.upsellApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const res = await r.json();
      if (res.status === "succeeded" || res.status === "already") return done();
      if (res.status === "requires_action" && window.Stripe && res.publishable_key) {
        // Banka traži potvrdu (3DS): kupac potvrdi u Stripe prozoru
        const { error } = await Stripe(res.publishable_key).confirmCardPayment(res.client_secret);
        return error ? setState("failed") : done();
      }
      setState("failed");
    } catch (e) {
      setState("failed");
    }
  };
}

/* =========================================================
   /hvala — prikaz kartica po porudžbini
   ========================================================= */
const mount = document.querySelector("[data-cards]");
if (mount) {
  document.querySelectorAll("[data-circle]").forEach((a) => (a.href = FUNNEL.circleUrl));
  const portal = () => mount.querySelectorAll("[data-portal]").forEach((a) => (a.href = FUNNEL.portalUrl));

  const show = (flags) => {
    const add = (id) => mount.append(document.getElementById(id).content.cloneNode(true));
    if (flags.labClan) add("card-lab-clan");
    else if (flags.lab) add("card-lab");
    fill(mount);
    portal();
  };

  const fromUrl = () => ({
    lab: params.get("lab") === "1",
    labClan: params.get("lab") === "clan",
  });

  // Webhook ponekad stigne sekundu posle kupca, pa pitamo server nekoliko puta
  const load = (tries = 0) =>
    fetch(`${FUNNEL.orderApi}?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((res) => (res.ready || tries >= 10 ? (show(res), purchasePixel(res)) : setTimeout(() => load(tries + 1), 1500)))
      .catch(() => show(fromUrl()));

  if (FUNNEL.demo || !sessionId) show(fromUrl());
  else load();

  // Meta Pixel Purchase: isti event_id (session_id) šalje i server preko Conversions API, pa se broji jednom
  const purchasePixel = (res) =>
    res.amount && window.studioTrack?.("purchase_page", { amount: res.amount }, { event: "Purchase", data: { value: res.amount, currency: res.currency }, eventID: sessionId });
}
