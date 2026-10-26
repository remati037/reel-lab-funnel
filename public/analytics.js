/* =========================================================
   Analitika i kolačići za sve stranice.
   - PostHog (EU) radi uvek, ali bez kolačića dok posetilac ne pristane
     (tada se podaci čuvaju samo u memoriji stranice).
   - Meta Pixel se učitava tek posle pristanka.
   - Ključevi dolaze sa servera: /api/config.js → window.STUDIO_CONFIG
   Upotreba sa drugih stranica: window.studioTrack("ime_dogadjaja", { ...osobine })
   ========================================================= */
(function () {
  const CFG = window.STUDIO_CONFIG || {};
  const KEY = "studio_consent"; // "all" | "necessary"

  const getConsent = () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  };
  const setConsent = (v) => {
    try {
      localStorage.setItem(KEY, v);
    } catch {}
  };
  const cookie = (name) => (document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)")) || [])[1] || "";

  /* ---------- PostHog ---------- */
  function startPosthog() {
    if (!CFG.posthogKey || !window.posthog?.init) return;
    window.posthog.init(CFG.posthogKey, {
      api_host: "https://eu.i.posthog.com",
      person_profiles: "identified_only",
      persistence: getConsent() === "all" ? "localStorage+cookie" : "memory",
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: getConsent() !== "all",
    });
  }

  /* ---------- Meta Pixel (samo uz pristanak) ---------- */
  function startPixel() {
    if (!CFG.pixelId || window.fbq) return;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq("init", CFG.pixelId);
    window.fbq("track", "PageView");
  }

  function grant() {
    setConsent("all");
    window.posthog?.set_config?.({ persistence: "localStorage+cookie", disable_session_recording: false });
    window.posthog?.startSessionRecording?.();
    startPixel();
  }

  /* ---------- javni API ---------- */
  // Događaj u PostHog; uz pristanak i u Meta Pixel (fb = { event, data, eventID })
  window.studioTrack = function (event, props = {}, fb) {
    window.posthog?.capture?.(event, props);
    if (fb && window.fbq && getConsent() === "all") window.fbq("track", fb.event, fb.data || {}, fb.eventID ? { eventID: fb.eventID } : undefined);
  };
  // Šta ide serveru uz kupovinu ili prijavu (za spajanje posete sa kupovinom i za Conversions API)
  window.studioIds = function () {
    const ids = { consent: getConsent() === "all" ? "1" : "0" };
    const ph = window.posthog?.get_distinct_id?.();
    if (ph) ids.ph_id = ph;
    if (ids.consent === "1") {
      if (cookie("_fbp")) ids.fbp = cookie("_fbp");
      if (cookie("_fbc")) ids.fbc = cookie("_fbc");
    }
    return ids;
  };
  window.studioConsent = getConsent;

  /* ---------- banner za kolačiće ---------- */
  function banner() {
    if (document.querySelector(".cookie-bar")) return;
    const bar = document.createElement("div");
    bar.className = "cookie-bar";
    bar.setAttribute("role", "dialog");
    bar.setAttribute("aria-label", "Kolačići");
    bar.innerHTML =
      '<p>Koristimo kolačiće da merimo šta na sajtu radi i koje objave i oglasi dovode ljude. <a href="/privatnost">Više</a></p>' +
      '<div class="cookie-btns"><button type="button" data-c="necessary">Samo neophodni</button><button type="button" data-c="all">Prihvatam</button></div>';
    bar.addEventListener("click", (e) => {
      const c = e.target.closest("[data-c]")?.dataset.c;
      if (!c) return;
      if (c === "all") grant();
      else setConsent("necessary");
      window.posthog?.capture?.("cookie_choice", { choice: c });
      bar.remove();
    });
    document.body.append(bar);
  }

  const css = document.createElement("style");
  css.textContent =
    ".cookie-bar{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;background:#1C1C1F;color:#F4EDE0;border:1px solid rgba(244,237,224,.3);border-radius:8px;padding:16px 18px;font:400 14px/1.5 'Libre Franklin',system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.5)}" +
    ".cookie-bar p{margin:0 0 12px}.cookie-bar a{color:#FF5B1F}" +
    ".cookie-btns{display:flex;gap:10px;flex-wrap:wrap}.cookie-btns button{flex:1;min-width:140px;height:42px;border-radius:6px;font:600 14px 'Libre Franklin',system-ui,sans-serif;cursor:pointer;border:1px solid rgba(244,237,224,.3);background:transparent;color:#F4EDE0}" +
    ".cookie-btns button[data-c=all]{background:#FF5B1F;border-color:#FF5B1F;color:#160903}";
  document.head.append(css);

  /* ---------- automatski događaji ---------- */
  function autoEvents() {
    // Klik na dugme za kupovinu: iz koje sekcije
    document.addEventListener("click", (e) => {
      const a = e.target.closest(".js-buy");
      if (!a) return;
      const sec = a.closest("section");
      const scene = sec?.querySelector(".scene b")?.textContent;
      window.studioTrack("cta_click", { section: sec?.id || (scene ? "scena_" + scene : "ostalo"), text: a.textContent.trim().slice(0, 60) });
    });
    // Otvoreno pitanje u FAQ
    document.addEventListener(
      "toggle",
      (e) => {
        if (e.target.tagName === "DETAILS" && e.target.open)
          window.studioTrack("faq_open", { question: e.target.querySelector("summary")?.textContent.trim().slice(0, 80) });
      },
      true
    );
    // Pokrenut video
    document.addEventListener("play", (e) => e.target.tagName === "VIDEO" && window.studioTrack("video_play", { src: e.target.currentSrc?.split("/").pop() }), true);
    // Koliko daleko je skrolovao (jednom po pragu)
    const seen = new Set();
    addEventListener(
      "scroll",
      () => {
        const p = (scrollY + innerHeight) / document.documentElement.scrollHeight;
        for (const t of [25, 50, 75, 100]) if (p * 100 >= t - 1 && !seen.has(t)) seen.add(t), window.studioTrack("scroll_depth", { percent: t });
      },
      { passive: true }
    );
    // Link "Podešavanja kolačića" u footeru
    document.querySelectorAll("[data-cookie-settings]").forEach((a) =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        banner();
      })
    );
  }

  startPosthog();
  if (getConsent() === "all") startPixel();
  const ready = () => {
    autoEvents();
    if (!getConsent()) banner();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", ready) : ready();
})();
