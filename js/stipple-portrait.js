/* Stipple portrait — the About section's interactive engraving.
   Samples the portrait image's luminance into a field of ink dots
   (darker pixel → bigger dot); dots near the pointer are pushed away and
   spring back home. Ink color reads --plaque-ink via computed style, and
   re-reads on theme flips. Reduced-motion: static field, no animation.
   The rAF loop runs only while dots are displaced — an idle page costs
   nothing. */
(function () {
  "use strict";

  const canvas = document.querySelector(".stipple-portrait");
  if (!canvas || !canvas.dataset.portraitSrc) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLS = 120;       // dot-grid columns across the portrait (higher = finer)
  const MAX_R = 1.7;      // dot radius at full darkness (display px)
  const MIN_R = 0.28;     // lighter than this → no dot
  const POINTER_R = 56;   // pointer influence radius (display px)
  const PUSH = 3.2;       // displacement impulse per frame inside the radius
  const SPRING = 0.06;    // pull back toward home
  const DAMP = 0.82;      // velocity damping
  const EPS = 0.05;       // below this offset+velocity a dot counts as home

  /* Pure: nudge dots within `radius` of (cx, cy) outward with an impulse
     that falls off linearly with distance. Mutates `dots[i].vx / vy` so the
     next tick() draws the displacement — same shape as the idle flicker,
     just centred on a point the caller picks (a finger tap, in practice).
     Exposed for the runnable self-check. */
  function applyRipple(dots, cx, cy, radius, strength) {
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      const dx = d.hx - cx, dy = d.hy - cy, dist = Math.hypot(dx, dy);
      if (dist < radius) {
        const f = (1 - dist / radius) * strength;
        d.vx += (dist > 0.001 ? dx / dist : 0) * f;
        d.vy += (dist > 0.001 ? dy / dist : 1) * f;
      }
    }
  }
  window.__stippleApplyRipple = applyRipple;

  /* Pure: ImageData → [{hx, hy, r}] in image space on a cols-wide grid.
     Rec.709 luminance drives radius. Exposed on window as the runnable
     self-check seam (see tests/test_stipple_portrait.py). */
  function computeDotField(imageData, cols, maxR, minR) {
    const step = imageData.width / cols;
    const rows = Math.floor(imageData.height / step);
    const dots = [];
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const sx = Math.min(imageData.width - 1, Math.round((gx + 0.5) * step));
        const sy = Math.min(imageData.height - 1, Math.round((gy + 0.5) * step));
        const i = (sy * imageData.width + sx) * 4;
        const a = imageData.data[i + 3];
        const lum =
          0.2126 * imageData.data[i] +
          0.7152 * imageData.data[i + 1] +
          0.0722 * imageData.data[i + 2];
        // Alpha folds into darkness: a cut-out portrait (transparent PNG) drops
        // its background to blank paper, and soft hair mattes fade out instead
        // of hard-edging. Opaque photos (a=255) are unaffected — backward
        // compatible with the placeholder.
        const r = (1 - lum / 255) * (a / 255) * maxR;
        if (r >= minR) {
          dots.push({ hx: (gx + 0.5) * step, hy: (gy + 0.5) * step, r: r });
        }
      }
    }
    return dots;
  }
  window.__stippleComputeDotField = computeDotField;

  let dots = [];
  let ink = "#0c0c0a";
  let running = false;
  let pointer = null; // {x, y} in display px, or null
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function readInk() {
    ink = getComputedStyle(canvas).color;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = ink;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      ctx.beginPath();
      ctx.arc(d.x * dpr, d.y * dpr, d.r * dpr, 0, 6.2832);
      ctx.fill();
    }
  }

  function settled() {
    if (pointer) return false;
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (
        Math.abs(d.x - d.hx) + Math.abs(d.y - d.hy) +
        Math.abs(d.vx) + Math.abs(d.vy) > EPS
      ) {
        return false;
      }
    }
    return true;
  }

  function tick() {
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (pointer) {
        const dx = d.x - pointer.x;
        const dy = d.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < POINTER_R && dist > 0.001) {
          const f = (1 - dist / POINTER_R) * PUSH;
          d.vx += (dx / dist) * f;
          d.vy += (dy / dist) * f;
        }
      }
      d.vx = (d.vx + (d.hx - d.x) * SPRING) * DAMP;
      d.vy = (d.vy + (d.hy - d.y) * SPRING) * DAMP;
      d.x += d.vx;
      d.y += d.vy;
    }
    draw();
    if (settled()) {
      // snap home so the field is pixel-identical to the static render
      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.x = d.hx; d.y = d.hy; d.vx = 0; d.vy = 0;
      }
      draw();
      running = false;
      return;
    }
    requestAnimationFrame(tick);
  }

  function wake() {
    if (REDUCED || running) return;
    running = true;
    requestAnimationFrame(tick);
  }

  function init(img) {
    // ponytail: sized once from layout at init; a window resize re-renders
    // on next visit, not live. Add a ResizeObserver if it ever matters.
    const cssW = canvas.clientWidth || 300;
    const cssH = canvas.clientHeight || Math.round((cssW * 5) / 4);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    const probe = document.createElement("canvas");
    probe.width = img.naturalWidth;
    probe.height = img.naturalHeight;
    const pctx = probe.getContext("2d", { willReadFrequently: true });
    pctx.drawImage(img, 0, 0);
    const field = computeDotField(
      pctx.getImageData(0, 0, probe.width, probe.height),
      COLS, MAX_R, MIN_R
    );

    // map image space → display space, letterboxed to the canvas
    const scale = Math.min(cssW / img.naturalWidth, cssH / img.naturalHeight);
    const ox = (cssW - img.naturalWidth * scale) / 2;
    const oy = (cssH - img.naturalHeight * scale) / 2;
    // Non-reduced: dots start scattered from home; the first wake() call
    // (fired when the About section scrolls into view) springs them into
    // formation. Reduced-motion: land at home immediately, static engraving.
    const scatter = REDUCED ? 0 : 1;
    dots = field.map(function (d) {
      const hx = ox + d.hx * scale;
      const hy = oy + d.hy * scale;
      const ang = Math.random() * 6.2832;
      const dist = (30 + Math.random() * 130) * scatter;
      return {
        hx: hx, hy: hy,
        x: hx + Math.cos(ang) * dist,
        y: hy + Math.sin(ang) * dist,
        vx: 0, vy: 0, r: d.r
      };
    });

    readInk();
    draw();

    if (REDUCED) return; // static engraving only

    // Expose wake for app.js — fired once when About scrolls into view so the
    // scattered dots assemble in front of the user, not before.
    window.__stippleWake = wake;

    canvas.addEventListener("pointermove", function (e) {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      wake();
    });
    canvas.addEventListener("pointerleave", function () {
      pointer = null;
      wake(); // let the field spring home, then the loop stops itself
    });
    // pointerleave is spec'd to fire on touch-lift but Safari has historically
    // been flaky about it. Explicit pointerup/cancel guarantee the spring-back
    // on a finger release; gated by pointerType so mouse clicks don't kill
    // the desktop hover.
    canvas.addEventListener("pointerup", function (e) {
      if (e.pointerType === "touch") { pointer = null; wake(); }
    });
    canvas.addEventListener("pointercancel", function (e) {
      if (e.pointerType === "touch") { pointer = null; wake(); }
    });

    // Coarse pointer (touch) — a static tap barely moves the field because
    // pointermove only fires during drag. Emit an explicit ripple at the tap
    // point so a single tap has a visible payoff. Drag still works via
    // pointermove above.
    if (matchMedia("(pointer: coarse)").matches) {
      canvas.addEventListener("pointerdown", function (e) {
        if (e.pointerType !== "touch") return;
        const rect = canvas.getBoundingClientRect();
        applyRipple(dots, e.clientX - rect.left, e.clientY - rect.top, 60, 2.5);
        wake();
      });
    }

    // Idle flicker — every ~2.8s, if nobody's touching + canvas is on-screen,
    // ripple a random cluster of dots. Invitation to touch. Skipped when the
    // tab is hidden so the page costs nothing in the background.
    setInterval(function () {
      if (pointer || document.hidden || !dots.length) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const c = dots[Math.floor(Math.random() * dots.length)];
      applyRipple(dots, c.hx, c.hy, 34, 1.6);
      wake();
    }, 2800);
  }

  // redraw in the new ink when the theme flips (data-theme on <html>)
  new MutationObserver(function () {
    readInk();
    if (!running) draw();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  const img = new Image();
  img.decoding = "async";
  img.onload = function () { init(img); };
  img.src = canvas.dataset.portraitSrc;
})();
