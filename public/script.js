/* =========================================================
   PODEŠAVANJA: menjaj ovde
   ========================================================= */
const CONFIG = {
  // Svako dugme vodi na našu checkout stranicu. UTM parametri sa landinga idu dalje.
  checkoutUrl: "/checkout",

  // Posle zatvaranja dugmad vode ovde (lista čekanja). Prazno = dugmad ostaju kakva jesu.
  waitlistUrl: "", // [UBACI link ka listi čekanja]

  // Mejl za podršku. Prazno = na stranici stoji vidljiv placeholder.
  supportEmail: "", // [UBACI pravu mejl adresu za podršku]

  // Faze cene. +01:00 = srednjoevropsko vreme. Tajmer broji do kraja TRENUTNE faze i nikad se ne resetuje.
  phases: [
    { until: "2026-11-11T21:00:00+01:00", price: "67€" }, // faza 1: cena za lansiranje (do srede, 11. nov; isto kao LAUNCH_UNTIL u wrangler.jsonc)
    { until: "2026-11-15T21:00:00+01:00", price: "97€" }, // faza 2: redovna cena, pa vrata zatvorena (CLOSE_AT)
  ],

  // Fiksni tekstovi: upisuju se svuda gde u HTML-u piše data-t="...". data-t="price" je cena trenutne faze.
  texts: {
    regularPrice: "97€",
    launchPrice: "67€",
  },

  // Natpisi uz tajmer, po fazi: [faza 1, faza 2, zatvoreno]
  labels: {
    short: ["Cena raste za", "Zatvaramo za", "Vrata su zatvorena"],
    long: ["Cena raste na 97€ za", "Vrata se zatvaraju za", "Vrata su zatvorena"],
  },
};

/* ---------- A/B hero: ?v=b prikazuje verziju B, sve ostalo A ---------- */
const variant = new URLSearchParams(location.search).get("v") === "b" ? "b" : "a";
document.documentElement.dataset.variant = variant;
document.querySelectorAll("[data-variant]").forEach((el) => (el.hidden = el.dataset.variant !== variant));

/* ---------- tekstovi i linkovi ---------- */
document.querySelectorAll("[data-t]").forEach((el) => {
  const v = CONFIG.texts[el.dataset.t];
  if (v) el.textContent = v;
});
document.querySelectorAll(".js-buy").forEach((a) => (a.href = CONFIG.checkoutUrl + location.search));
document.querySelectorAll(".js-mail").forEach((a) => {
  if (CONFIG.supportEmail) {
    a.href = `mailto:${CONFIG.supportEmail}`;
    a.textContent = CONFIG.supportEmail;
    a.classList.remove("todo");
  }
});

/* ---------- faze cene ---------- */
const phaseEnds = CONFIG.phases.map((p) => new Date(p.until).getTime());

// 0 = faza 1, 1 = faza 2, 2 = zatvoreno
function currentPhase(now) {
  const i = phaseEnds.findIndex((t) => now < t);
  return i === -1 ? CONFIG.phases.length : i;
}

let shownPhase = null;
function applyPhase(phase) {
  if (phase === shownPhase) return;
  shownPhase = phase;
  const closed = phase >= CONFIG.phases.length;
  const price = closed ? CONFIG.texts.regularPrice : CONFIG.phases[phase].price;

  document.querySelectorAll('[data-t="price"]').forEach((el) => (el.textContent = price));
  document.querySelectorAll("[data-phase-only]").forEach((el) => (el.hidden = Number(el.dataset.phaseOnly) !== phase + 1));
  document.querySelectorAll("[data-label]").forEach((el) => {
    el.textContent = CONFIG.labels[el.dataset.label][Math.min(phase, 2)];
  });

  // timeline u sekciji "Nedelja lansiranja": past / now / future i "Ti si ovde"
  document.querySelectorAll(".tl[data-phase]").forEach((el) => {
    const n = Number(el.dataset.phase) - 1;
    el.classList.toggle("past", n < phase);
    el.classList.toggle("now", n === phase);
    el.classList.toggle("future", n > phase);
    el.querySelectorAll("small.here").forEach((s) => s.remove());
    if (n === phase && n < CONFIG.phases.length) {
      const here = document.createElement("small");
      here.className = "here";
      here.textContent = "Ti si ovde";
      el.querySelector(".amt").append(here);
    }
  });

  if (closed && CONFIG.waitlistUrl) {
    document.querySelectorAll(".js-buy").forEach((a) => {
      a.href = CONFIG.waitlistUrl;
      a.textContent = "Prijavi se na listu čekanja";
    });
  }
}

/* ---------- odbrojavanje ---------- */
const pad = (n) => String(n).padStart(2, "0");

function daysLabel(d) {
  if (d % 10 === 1 && d % 100 !== 11) return `${d} dan`;
  return `${d} dana`;
}

function tick() {
  const now = Date.now();
  const phase = currentPhase(now);
  applyPhase(phase);

  const end = phaseEnds[Math.min(phase, phaseEnds.length - 1)];
  const left = Math.max(0, end - now);
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

/* ---------- montažna traka iza hero dela ----------
   Izbledela traka iz programa za montažu: titlovi, efekti, dva video traga, glas i muzika.
   Gradi se iz fiksnog seed-a, pa je ista pri svakoj poseti. Svaki trag je tačno jedan krug širok,
   pa se svi pomeraju kao jedna traka ispod narandžaste glave za reprodukciju. */
(function buildTimeline() {
  const tl = document.getElementById("tl");
  if (!tl) return;
  const W = 2600;
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const FILES = ["IMG_4821.MOV", "IMG_4822.MOV", "TAKE_02.MOV", "B-ROLL_01.MP4", "IMG_4825.MOV", "SCREEN_REC.MP4", "TAKE_03.MOV", "B-ROLL_02.MP4"];
  const FX = ["Type Wall", "Digital Zoom", "Green Screen", "Frame Break", "Spotlight", "UI World", "Clone", "Checklist", "Orbit", "Blackout"];
  function wave(amp) {
    let r = "";
    for (let i = 0; i < 90; i++) {
      const h = 3 + Math.round(rnd() * rnd() * 36 * amp);
      r += `<rect x="${i * 4}" y="${20 - h / 2}" width="2" height="${h}" rx="1"/>`;
    }
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40" fill="#D8CDB8">${r}</svg>`)}")`;
  }
  const WAVES = [wave(1), wave(0.8), wave(0.45)];
  let n = 0;
  function track(kind, min, max, gaps) {
    let out = "", x = 0;
    while (x < W) {
      let w = Math.round(min + rnd() * (max - min));
      if (W - x - w < min) w = W - x;
      const gap = rnd() < gaps;
      let st = `width:${w}px`, extra = "";
      if (!gap && kind === "v") extra = ` data-l="${FILES[n++ % FILES.length]}"`;
      if (!gap && kind === "a") st += `;--f:${WAVES[n++ % 2]}`;
      if (!gap && kind === "m") st += `;--f:${WAVES[2]}`;
      if (!gap && kind === "fx") extra = ` data-l="${FX[n++ % FX.length]}"`;
      out += `<i class="c ${gap ? "c-gap" : "c-" + kind}" style='${st}'${extra}></i>`;
      x += w;
    }
    return `<div class="tl-track tl-${kind}"><div class="tl-strip">${out}${out}</div></div>`;
  }
  let ticks = "";
  for (let t = 0; t < W * 2; t += 200) {
    const sec = (t / 200) % (W / 200);
    ticks += `<b style="left:${t}px">00:${sec < 10 ? "0" : ""}${sec}</b>`;
  }
  tl.innerHTML =
    `<div class="tl-in"><div class="tl-ruler"><div class="tl-strip" style="width:${W * 2}px">${ticks}</div></div>` +
    track("cap", 50, 150, 0.22) + track("fx", 120, 300, 0.55) + track("v", 150, 420, 0.5) + track("v", 220, 620, 0) +
    track("a", 220, 620, 0.06) + track("m", 500, 1100, 0.12) +
    `</div><i class="tl-head"></i>`;
})();

/* ---------- hero video: dugme za zvuk ---------- */
const heroVid = document.getElementById("heroVid");
const heroSound = document.getElementById("heroSound");
if (heroVid && heroSound) {
  heroSound.addEventListener("click", () => {
    heroVid.muted = !heroVid.muted;
    if (!heroVid.muted) heroVid.play();
    heroSound.textContent = heroVid.muted ? "▶ Pusti zvuk" : "❚❚ Isključi zvuk";
  });
}

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
