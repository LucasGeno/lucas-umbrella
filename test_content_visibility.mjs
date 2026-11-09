import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { shouldReveal } from "./js/reveal.mjs";

const css = readFileSync("css/room1.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
// Public stylesheet contract: static content must never be hidden by a bare
// selector. Empty hover metadata and the JS-populated clock are intentional.
for (const selector of [".plaque-section-line", ".plaque-copy", ".plaque-colophon", "[data-reveal]"]) {
  for (const [, selectors, declarations] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (selectors.split(",").some(s => s.trim() === selector)) {
      assert.doesNotMatch(declarations, /opacity:\s*0\s*[;}]/, `${selector} must be visible before JS initializes`);
    }
  }
}
for (const file of ["index.html", "403.html", "404.html", "500.html"]) {
  const html = readFileSync(file, "utf8");
  assert.doesNotMatch(html, /data-(?:mounted|revealed)="false"/, `${file} must not opt into hiding in static HTML`);
  assert.match(html, /class="plaque-colophon"[\s\S]*?<a /, `${file} retains recovery/navigation links`);
}

const app = readFileSync("js/app.js", "utf8").replace(/^import .*;\n/, "");
for (const reduced of [false, true]) {
  const frames = [], listeners = new Map();
  const element = (top) => ({
    attrs: {}, top,
    setAttribute(name, value) { this.attrs[name] = value; },
    getBoundingClientRect() { return { top: this.top, bottom: this.top + 100 }; },
  });
  const plaque = element(0), near = element(10), far = element(2000);
  runInNewContext(app, {
    shouldReveal, matchMedia: () => ({ matches: reduced }),
    document: {
      getElementById: id => id === "plaque" ? plaque : null,
      querySelectorAll: () => [near, far], querySelector: () => null,
    },
    window: { innerHeight: 1000, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener() {} },
    requestAnimationFrame: fn => frames.push(fn), setInterval: () => 1, clearInterval() {},
  });
  assert.equal(plaque.attrs["data-mounted"], "false", "entrance begins only when the controller runs");
  frames.forEach(fn => fn());
  assert.equal(plaque.attrs["data-mounted"], "true", "entrance still completes next frame");
  assert.equal(near.attrs["data-revealed"], "true");
  assert.equal(far.attrs["data-revealed"], reduced ? "true" : "false");
  if (!reduced) {
    far.top = 100;
    listeners.get("scroll")();
    assert.equal(far.attrs["data-revealed"], "true", "scroll still reveals content");
  }
}
console.log("content visibility ok (static fallback, entrance, scroll, reduced motion)");
