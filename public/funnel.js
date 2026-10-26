/* =========================================================
   PODEŠAVANJA za /ponuda i /hvala — menjaj ovde
   ========================================================= */
const FUNNEL = {
  // true = pregled bez servera: dugme "Da" samo glumi uspešnu naplatu.
  // Kad postoje /api/upsell i /api/order (vidi FUNNEL-PLAN.md), stavi false.
  demo: true,

  upsellApi: "/api/upsell",  // POST { session_id } → { status: "succeeded" | "requires_action" | "declined" | "already" }
  orderApi: "/api/order",    // GET ?session_id= → { radionica: bool, lab: bool, bump: bool, labClan: bool }
  stripeKey: "",             // pk_live_... ili pk_test_..., treba samo za 3DS potvrdu

  circleUrl: "https://TVOJ-CIRCLE/c/kreni-ovde/instalacija", // direktno na lekciju Instalacija
  email: "info@tvojdomen.rs",

  lab: { first: "1€", monthly: "47€", regular: "57€", trialDays: 30 },

  workshop: {
    text: "Nedelja, 22. novembar u 11h",
    start: "2026-11-22T11:00:00+01:00",
    hours: 2,
    title: "Creator Studio radionica uživo",
  },
};

/* ---------- zajedničko ---------- */
const params = new URLSearchParams(location.search);
const sessionId = params.get("session_id") || "";

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
  // u test modu flagovi porudžbine putuju kroz URL (uživo ih zna server)
  if (FUNNEL.demo) ["bump", "radionica"].forEach((k) => params.has(k) && u.searchParams.set(k, params.get(k)));
  Object.entries(extra).forEach(([k, v]) => u.searchParams.set(k, v));
  return u.pathname.split("/").pop() + u.search;
}

/* =========================================================
   /ponuda — one-click upsell
   ========================================================= */
const offer = document.querySelector("[data-offer]");
if (offer) {
  // datum prve naplate od 47€
  const d = new Date(Date.now() + FUNNEL.lab.trialDays * 86400000);
  const months = ["januara", "februara", "marta", "aprila", "maja", "juna", "jula", "avgusta", "septembra", "oktobra", "novembra", "decembra"];
  const dateText = `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
  document.querySelectorAll("[data-renew-date]").forEach((el) => (el.textContent = dateText));

  const no = offer.querySelector("[data-no]");
  no.href = withSession("hvala.html");

  const yes = offer.querySelector("[data-yes]");
  const label = yes.querySelector("span");
  const setState = (s) => {
    offer.dataset.state = s;
    yes.disabled = s === "processing";
    label.textContent = s === "processing" ? "Obrađujem..." : yes.dataset.label;
  };
  const done = () => (location.href = withSession("hvala.html", { lab: "1" }));

  yes.addEventListener("click", async () => {
    setState("processing");
    if (FUNNEL.demo) return setTimeout(() => (params.get("fail") === "1" ? setState("failed") : done()), 900);
    try {
      const r = await fetch(FUNNEL.upsellApi, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const res = await r.json();
      if (res.status === "succeeded" || res.status === "already") return done();
      if (res.status === "requires_action" && window.Stripe && FUNNEL.stripeKey) {
        // Banka traži potvrdu (3DS): kupac potvrdi u Stripe prozoru
        const { error } = await Stripe(FUNNEL.stripeKey).confirmCardPayment(res.client_secret);
        return error ? setState("failed") : done();
      }
      setState("failed");
    } catch (e) {
      setState("failed");
    }
  });
}

/* =========================================================
   /hvala — prikaz kartica po porudžbini
   ========================================================= */
const mount = document.querySelector("[data-cards]");
if (mount) {
  document.querySelectorAll("[data-circle]").forEach((a) => (a.href = FUNNEL.circleUrl));

  const show = (flags) => {
    const add = (id) => mount.append(document.getElementById(id).content.cloneNode(true));
    if (flags.labClan) add("card-lab-clan");
    else if (flags.lab) add("card-lab");
    if (flags.bump) add("card-bump");
    if (flags.radionica) add("card-radionica");
    fill(mount);
    wireCalendar();
  };

  const fromUrl = () => ({
    lab: params.get("lab") === "1",
    labClan: params.get("lab") === "clan",
    bump: params.get("bump") === "1",
    radionica: params.get("radionica") === "1",
  });

  // Webhook ponekad stigne sekundu posle kupca, pa pitamo server nekoliko puta
  const load = (tries = 0) =>
    fetch(`${FUNNEL.orderApi}?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((res) => (res.ready || tries >= 10 ? show(res) : setTimeout(() => load(tries + 1), 1500)))
      .catch(() => show(fromUrl()));

  if (FUNNEL.demo || !sessionId) show(fromUrl());
  else load();

  // Meta Pixel Purchase (dedup sa CAPI preko event_id = session_id)
  // if (window.fbq && sessionId) fbq("track", "Purchase", { value: UKUPNO, currency: "EUR" }, { eventID: sessionId });
}

function wireCalendar() {
  const w = FUNNEL.workshop;
  const start = new Date(w.start);
  const end = new Date(start.getTime() + w.hours * 3600000);
  const fmt = (x) => x.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const gcal =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(w.title)}&dates=${fmt(start)}/${fmt(end)}` +
    `&details=${encodeURIComponent("Zoom link stiže mejlom pre radionice.")}`;
  document.querySelectorAll("[data-gcal]").forEach((a) => (a.href = gcal));
  document.querySelectorAll("[data-ws-when]").forEach((el) => (el.textContent = w.text));
}
