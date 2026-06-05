(function () {
  // ---- signature interaction 1: section-hover thinning + meta fade ----
  var plaque = document.getElementById("plaque");
  var meta = document.getElementById("meta");
  var sections = document.getElementById("sections").querySelectorAll(".plaque-section");
  function activate(el) {
    plaque.setAttribute("data-active", "true");
    meta.textContent = el.getAttribute("data-meta");
    meta.setAttribute("data-visible", "true");
  }
  function deactivate() {
    plaque.removeAttribute("data-active");
    meta.removeAttribute("data-visible");
  }
  sections.forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); });
    el.addEventListener("mouseenter", function () { activate(el); });
    el.addEventListener("mouseleave", deactivate);
    el.addEventListener("focus", function () { activate(el); });
    el.addEventListener("blur", deactivate);
  });

  // ---- signature interaction 2: wordmark tap-pulse ----
  var wordmark = document.getElementById("wordmark");
  var pulseTimer = null;
  wordmark.addEventListener("click", function () {
    if (pulseTimer) clearTimeout(pulseTimer);
    plaque.removeAttribute("data-pulsing");
    // force reflow so the animation restarts on rapid taps
    void plaque.offsetWidth;
    plaque.setAttribute("data-pulsing", "true");
    pulseTimer = setTimeout(function () { plaque.removeAttribute("data-pulsing"); }, 720);
  });

  // ---- theme toggle ----
  document.getElementById("toggle").addEventListener("click", function () {
    var root = document.documentElement;
    root.setAttribute("data-theme", root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  // ---- carousel: arrow keys, horizontal scroll, swipe, dots ----
  var track = document.getElementById("track");
  var dots = Array.prototype.slice.call(document.querySelectorAll(".carousel-dot"));
  var COUNT = 4, index = 0;
  function goTo(i) {
    index = Math.max(0, Math.min(COUNT - 1, i));
    track.style.transform = "translateX(" + (-index * 100) + "%)";
    dots.forEach(function (d, n) { d.setAttribute("aria-current", n === index ? "true" : "false"); });
    if (index === 1) {
      var r2 = document.querySelectorAll(".carousel-slide")[1];
      if (r2) r2.classList.add("r2-grow");
    }
    document.getElementById("dots").classList.toggle("dots-on-night", index === 2 || index === 3);
  }
  var _params = new URLSearchParams(location.search);
  var _sc = _params.get("showcase");
  if (_params.get("theme")) document.documentElement.setAttribute("data-theme", _params.get("theme"));
  var _initRoom = 3;
  if (_sc === "day" || _sc === "night") {
    _initRoom = 1;
    document.documentElement.setAttribute("data-theme", _sc === "night" ? "dark" : "light");
  } else if (_params.get("room")) {
    _initRoom = Math.max(0, Math.min(COUNT - 1, (parseInt(_params.get("room"), 10) || 1) - 1));
  }
  goTo(_initRoom); // initial slide (URL-overridable); Room 1 is the canonical front door

  dots.forEach(function (d) {
    d.addEventListener("click", function () { goTo(parseInt(d.getAttribute("data-index"), 10)); });
  });

  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { goTo(index + 1); }
    else if (e.key === "ArrowLeft") { goTo(index - 1); }
  });

  // horizontal wheel / trackpad scroll
  var wheelLock = false;
  document.getElementById("carousel").addEventListener("wheel", function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (wheelLock) return;
    if (e.deltaX > 12) { goTo(index + 1); wheelLock = true; }
    else if (e.deltaX < -12) { goTo(index - 1); wheelLock = true; }
    if (wheelLock) setTimeout(function () { wheelLock = false; }, 600);
  }, { passive: false });

  // touch swipe
  var touchX = null;
  var carousel = document.getElementById("carousel");
  carousel.addEventListener("touchstart", function (e) { touchX = e.touches[0].clientX; }, { passive: true });
  carousel.addEventListener("touchend", function (e) {
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (dx < -48) { goTo(index + 1); }
    else if (dx > 48) { goTo(index - 1); }
    touchX = null;
  }, { passive: true });
})();

/* ============================================================
   Room 2 — bird (day) + eyes (night) ambient choreography
   ============================================================ */
(function () {
  var params = new URLSearchParams(location.search);
  var showcase = params.get("showcase");
  var room2 = document.querySelector(".room2");
  var birdG = document.querySelector(".room2-bird .bird");
  var nightSvg = document.querySelector(".room2-night");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function theme() { return document.documentElement.getAttribute("data-theme"); }

  // ----- bird (day): a glimpse, ~30-60s apart, 6s gentle-arc crossing -----
  function flyBird() {
    if (!birdG) return;
    var dir = Math.random() < 0.5 ? 1 : -1;
    var band = 110 + Math.random() * 320;
    var drop = (Math.random() - 0.5) * 130;
    var x0 = dir > 0 ? -60 : 1500, x1 = dir > 0 ? 1500 : -60;
    var dur = 6000, t0 = performance.now();
    birdG.setAttribute("opacity", "1");
    (function step(t) {
      var p = (t - t0) / dur;
      if (p >= 1) { birdG.setAttribute("opacity", "0"); scheduleBird(); return; }
      var x = x0 + (x1 - x0) * p;
      var y = band + drop * Math.sin(Math.PI * p);
      var ang = (dir > 0 ? 6 : -6) + (drop > 0 ? 6 : -6) * Math.cos(Math.PI * p);
      birdG.setAttribute("transform", "translate(" + x.toFixed(1) + "," + y.toFixed(1) + ") rotate(" + ang.toFixed(1) + ") scale(" + dir + ",1)");
      requestAnimationFrame(step);
    })(t0);
  }
  function scheduleBird() {
    if (reduce) return;
    setTimeout(function () { theme() === "dark" ? scheduleBird() : flyBird(); }, 30000 + Math.random() * 30000);
  }

  // ----- eyes (night): one pair, rotating zones, blink, hunt-cooldown -----
  // Eye positions are encoded in the SVG markup as <g transform="translate(...)">;
  // hunt-proximity uses getBoundingClientRect on the active eye element so the
  // check stays accurate regardless of how the SVG slice-scales to the viewport.
  var eyeEls = nightSvg ? [].slice.call(nightSvg.querySelectorAll(".r2-eyes")) : [];
  var cooldownUntil = 0, zi = 0, activeEye = null, eyeState = "idle", eyesTimer = null;
  function byZone(z) { for (var i = 0; i < eyeEls.length; i++) if (eyeEls[i].getAttribute("data-zone") === z) return eyeEls[i]; return null; }
  function setLids(el, sy) { el.querySelectorAll(".r2-eye").forEach(function (s) { s.style.transform = "scaleY(" + sy + ")"; }); }
  function showEyes() {
    if (reduce) return;
    if (performance.now() < cooldownUntil) { scheduleEyes(6000); return; }
    var z = ["A", "B", "C"][zi++ % 3], el = byZone(z);
    if (!el) { scheduleEyes(5000); return; }
    activeEye = el; eyeState = "open";
    el.style.transition = "opacity .5s ease";
    el.querySelectorAll(".r2-eye").forEach(function (s) { s.style.transition = "transform .12s ease"; });
    setLids(el, 1); el.setAttribute("opacity", "1");
    var hold = 2000 + Math.random() * 2000;
    setTimeout(function () { if (eyeState === "open") { setLids(el, 0.04); setTimeout(function () { if (eyeState === "open") setLids(el, 1); }, 150); } }, hold * 0.5);
    setTimeout(function () { if (eyeState === "open") { eyeState = "idle"; el.setAttribute("opacity", "0"); activeEye = null; scheduleEyes(); } }, hold);
  }
  function scheduleEyes(delay) {
    if (reduce) return;
    clearTimeout(eyesTimer);
    eyesTimer = setTimeout(function () { theme() === "dark" ? showEyes() : scheduleEyes(8000); }, delay != null ? delay : 15000 + Math.random() * 15000);
  }
  // hunted: cursor within ~100px snaps them shut + long cooldown
  if (nightSvg) {
    document.getElementById("carousel").addEventListener("pointermove", function (e) {
      if (eyeState !== "open" || !activeEye || theme() !== "dark") return;
      var er = activeEye.getBoundingClientRect();
      var cx = er.left + er.width / 2, cy = er.top + er.height / 2;
      var d = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (d < 100) {
        activeEye.style.transition = "none"; activeEye.setAttribute("opacity", "0");
        eyeState = "idle"; activeEye = null;
        cooldownUntil = performance.now() + (45000 + Math.random() * 45000);
        scheduleEyes(cooldownUntil - performance.now() + 500);
      }
    });
  }

  // ----- init -----
  if (showcase === "day") {
    if (room2) room2.classList.add("showcase-day");
    if (birdG) { birdG.setAttribute("transform", "translate(432,225) rotate(8)"); birdG.setAttribute("opacity", "1"); }
  } else if (showcase === "night") {
    if (room2) room2.classList.add("showcase-night");
    var ea = byZone("A"); if (ea) ea.setAttribute("opacity", "1");
  } else {
    scheduleBird();
    scheduleEyes();
  }
})();
