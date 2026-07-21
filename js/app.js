import { shouldReveal } from "./reveal.mjs";

const plaque = document.getElementById("plaque");
const meta = document.getElementById("meta");
const sectionsRoot = document.getElementById("sections");
const wordmark = document.getElementById("wordmark");
const clock = document.getElementById("clock");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- Brussels clock (top-left, HH:MM in the site's TZ, refreshed 30s) ----
if (clock) {
  const tick = () => {
    const t = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Brussels", hour: "2-digit", minute: "2-digit"
    }).format(new Date());
    clock.textContent = `Brussels · ${t}`;
  };
  tick();
  setInterval(tick, 30000);
}

// ---- wordmark physics: entrance stagger + scroll-thin base + section-hover
//      thinning + cursor gravity + tap pulse. Shared state so one target wins. ----
let sectionActive = false;
let pulseAt = -1;
let pointer = null;

if (wordmark) {
  const letters = Array.from(wordmark.querySelectorAll(".plaque-wordmark__letter"))
    .map((el) => ({ el, w: 800, v: 0, holdUntil: 0 }));

  const write = (l, w) => {
    l.el.style.fontVariationSettings = `"opsz" 144, "wdth" 125, "wght" ${Math.round(w)}`;
  };

  if (reduced) {
    const applyStatic = () => letters.forEach((l) => write(l, sectionActive ? 100 : 800));
    applyStatic();
    window.__staticWordmarkApply = applyStatic;
  } else {
    // Entrance stagger: every letter starts thin, holds for 150+i*70ms, then
    // springs to base. The physics loop treats holdUntil as an override target.
    const t0 = performance.now();
    letters.forEach((l, i) => { l.w = 100; l.v = 0; l.holdUntil = t0 + 150 + i * 70; });

    const K = 130, C = 13, R = 190;
    let last = t0;
    const step = (t) => {
      const dt = Math.min(0.033, (t - last) / 1000);
      last = t;
      // scroll-thin: base weight interpolates 800→350 over the first ~70vh.
      const scrollP = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.7)));
      const scrollBase = 800 - scrollP * 450;
      const pulsing = pulseAt > 0 && t - pulseAt < 700;
      const base = sectionActive ? 100 : scrollBase;
      const gravityOn = !sectionActive && !pulsing && pointer;
      for (const l of letters) {
        let target = base;
        if (pulsing) target = t - pulseAt < 320 ? 100 : 800;
        if (l.holdUntil && t < l.holdUntil) target = 100;
        if (gravityOn && (!l.holdUntil || t >= l.holdUntil + 400)) {
          const r = l.el.getBoundingClientRect();
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const d = Math.hypot(pointer.x - cx, pointer.y - cy);
          if (d < R) target = Math.max(100, target - (1 - d / R) * (target - 100));
        }
        l.v += (target - l.w) * K * dt;
        l.v *= Math.max(0, 1 - C * dt);
        l.w += l.v * dt;
        if (l.w < 100) { l.w = 100; l.v = 0; }
        if (l.w > 1000) { l.w = 1000; l.v = 0; }
        write(l, l.w);
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);

    window.addEventListener("pointermove", (e) => { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
    window.addEventListener("pointerleave", () => { pointer = null; });
    document.addEventListener("mouseleave", () => { pointer = null; });
  }

  wordmark.addEventListener("click", () => { pulseAt = performance.now(); });
}

// ---- mount fade: flip data-mounted next frame so chrome fades in ----
if (plaque) {
  requestAnimationFrame(() => plaque.setAttribute("data-mounted", "true"));
}

// ---- section-hover meta fade + thinning trigger ----
if (plaque && meta && sectionsRoot) {
  const activate = (el) => {
    sectionActive = true;
    meta.textContent = el.getAttribute("data-meta");
    meta.setAttribute("data-visible", "true");
    if (reduced && window.__staticWordmarkApply) window.__staticWordmarkApply();
  };
  const deactivate = () => {
    sectionActive = false;
    meta.removeAttribute("data-visible");
    if (reduced && window.__staticWordmarkApply) window.__staticWordmarkApply();
  };
  sectionsRoot.querySelectorAll(".plaque-section").forEach((el) => {
    el.addEventListener("mouseenter", () => activate(el));
    el.addEventListener("mouseleave", deactivate);
    el.addEventListener("focus", () => activate(el));
    el.addEventListener("blur", deactivate);
  });
}

// ---- theme toggle ----
const toggle = document.getElementById("toggle");
if (toggle) {
  toggle.addEventListener("click", () => {
    const root = document.documentElement;
    root.setAttribute("data-theme", root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });
}

// ---- scroll hint fade (after 40px, sticky) ----
const hint = document.getElementById("hint");
if (hint) {
  const onScroll = () => {
    if (window.scrollY > 40) {
      hint.setAttribute("data-hidden", "true");
      window.removeEventListener("scroll", onScroll);
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
}

// ---- reveal-on-scroll on About / Index / Contact + wake stipple when the
//      portrait itself nears the fold (tighter threshold than the section
//      fade, so the user sees the dots assemble rather than finding them
//      pre-assembled). ----
const revealTargets = Array.from(document.querySelectorAll("[data-reveal]"));
let stippleWoken = false;
const stippleCanvas = document.querySelector(".stipple-portrait");
const maybeWakeStipple = () => {
  if (stippleWoken || !stippleCanvas || !window.__stippleWake) return;
  const rc = stippleCanvas.getBoundingClientRect();
  if (rc.top < window.innerHeight && rc.bottom > 0) {
    stippleWoken = true;
    window.__stippleWake();
  }
};
if (reduced) {
  revealTargets.forEach((el) => el.setAttribute("data-revealed", "true"));
} else {
  const check = () => {
    for (let i = revealTargets.length - 1; i >= 0; i--) {
      const el = revealTargets[i];
      if (shouldReveal(el.getBoundingClientRect(), window.innerHeight)) {
        el.setAttribute("data-revealed", "true");
        revealTargets.splice(i, 1);
      }
    }
    maybeWakeStipple();
    if (!revealTargets.length && stippleWoken) {
      window.removeEventListener("scroll", check);
      clearInterval(revT);
    }
  };
  window.addEventListener("scroll", check, { passive: true });
  const revT = setInterval(check, 400);
  check();
}
