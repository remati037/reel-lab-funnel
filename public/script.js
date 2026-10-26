/* =========================================================
   PODEŠAVANJA — menjaj ovde
   ========================================================= */
const CONFIG = {
  // Svako dugme vodi ovde. Server pravi Stripe Checkout sesiju (dok Stripe ključ
  // nije podešen, vraća na test checkout). UTM parametri sa landinga idu dalje.
  checkoutUrl: "/api/checkout",

  // Kad se vrata zatvaraju (odbrojavanje ide do ovog trenutka). +01:00 = srednjoevropsko vreme.
  deadline: "2026-10-25T21:00:00+01:00",

  // Cene — upisuju se svuda gde u HTML-u piše data-t="..."
  texts: {
    price: "97€",
    launchPrice: "67€",
  },
};

/* ---------- tekstovi i linkovi ---------- */
document.querySelectorAll("[data-t]").forEach((el) => {
  const v = CONFIG.texts[el.dataset.t];
  if (v) el.textContent = v;
});
document.querySelectorAll(".js-buy").forEach((a) => (a.href = CONFIG.checkoutUrl + location.search));

/* ---------- odbrojavanje ---------- */
const deadline = new Date(CONFIG.deadline).getTime();
const pad = (n) => String(n).padStart(2, "0");

function daysLabel(d) {
  if (d % 10 === 1 && d % 100 !== 11) return `${d} dan`;
  return `${d} dana`;
}

function tick() {
  const left = Math.max(0, deadline - Date.now());
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  const formats = {
    hms: `${pad(Math.floor(s / 3600))}:${pad(m)}:${pad(sec)}`,
    days: d > 0 ? daysLabel(d) : `${h}h ${m}min`,
    short: `${d}d ${h}h`,
  };
  document.querySelectorAll("[data-countdown]").forEach((el) => {
    el.textContent = formats[el.dataset.countdown];
  });

  const parts = { d, h, m, s: sec };
  document.querySelectorAll("[data-cd]").forEach((el) => {
    el.textContent = pad(parts[el.dataset.cd]);
  });
}
tick();
setInterval(tick, 1000);

/* ---------- sticky donja traka (pojavi se posle hero sekcije) ---------- */
const bar = document.getElementById("stickybar");
const hero = document.getElementById("top");
new IntersectionObserver(([e]) => bar.classList.toggle("on", !e.isIntersecting)).observe(hero);

/* ---------- animacija pri skrolu ---------- */
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  },
  { rootMargin: "0px 0px -8% 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
