import { shouldReveal } from "./reveal.mjs";

// Each subsystem null-guards its nodes so a missing element in one place
// doesn't cascade-unbind the rest.
const plaque = document.getElementById("plaque");
const meta = document.getElementById("meta");
const sectionsRoot = document.getElementById("sections");

// ---- section-hover thinning + meta fade ----
if (plaque && meta && sectionsRoot) {
  const activate = (el) => {
    plaque.setAttribute("data-active", "true");
    meta.textContent = el.getAttribute("data-meta");
    meta.setAttribute("data-visible", "true");
  };
  const deactivate = () => {
    plaque.removeAttribute("data-active");
    meta.removeAttribute("data-visible");
  };
  sectionsRoot.querySelectorAll(".plaque-section").forEach((el) => {
    el.addEventListener("mouseenter", () => activate(el));
    el.addEventListener("mouseleave", deactivate);
    el.addEventListener("focus", () => activate(el));
    el.addEventListener("blur", deactivate);
  });
}

// ---- wordmark tap-pulse ----
const wordmark = document.getElementById("wordmark");
if (plaque && wordmark) {
  let pulseTimer = null;
  wordmark.addEventListener("click", () => {
    if (pulseTimer) clearTimeout(pulseTimer);
    plaque.removeAttribute("data-pulsing");
    void plaque.offsetWidth; // reflow so animation restarts on rapid taps
    plaque.setAttribute("data-pulsing", "true");
    pulseTimer = setTimeout(() => plaque.removeAttribute("data-pulsing"), 720);
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

// ---- reveal-on-scroll on About / Index / Contact ----
// Uses shouldReveal (pure, self-checked) + a slow interval fallback so a
// section that loads already in view still reveals without user scroll.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const revealTargets = Array.from(document.querySelectorAll("[data-reveal]"));
if (reduce) {
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
    if (!revealTargets.length) {
      window.removeEventListener("scroll", check);
      clearInterval(revT);
    }
  };
  window.addEventListener("scroll", check, { passive: true });
  const revT = setInterval(check, 400);
  check();
}
