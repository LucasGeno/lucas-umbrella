import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { shouldReveal } from "./reveal.mjs";

// Execute the actual controller, supplying its real import and browser boundaries.
const source = readFileSync(new URL("./app.js", import.meta.url), "utf8")
  .replace('import { shouldReveal } from "./reveal.mjs";', "");
function mount(targets = [], canvas = null) {
  const intervals = new Map();
  const listeners = new Map();
  let scheduled = 0;
  let subscribed = 0;
  const window = {
    innerHeight: 1000,
    addEventListener(type, callback) { listeners.set(type, callback); subscribed++; },
    removeEventListener(type, callback) {
      if (listeners.get(type) === callback) listeners.delete(type);
    },
  };
  runInNewContext(source, {
    window, shouldReveal,
    document: {
      getElementById: () => null,
      querySelectorAll: () => targets,
      querySelector: () => canvas,
    },
    matchMedia: () => ({ matches: false }),
    setInterval(callback, delay) {
      assert.equal(delay, 400);
      intervals.set(++scheduled, callback);
      return scheduled;
    },
    clearInterval: (id) => intervals.delete(id),
  });
  return { window, intervals, listeners, scheduled, subscribed };
}

const empty = mount();
assert.equal(empty.scheduled, 0, "no reveal work must not start polling");
assert.equal(empty.subscribed, 0, "no reveal work must not add a scroll listener");

let top = 2000;
const attributes = {};
const target = {
  getBoundingClientRect: () => ({ top, bottom: top + 100 }),
  setAttribute: (name, value) => { attributes[name] = value; },
};
const sectionsOnly = mount([target]);
assert.equal(sectionsOnly.intervals.size, 1);
assert.equal(attributes["data-revealed"], undefined);
top = 500;
sectionsOnly.listeners.get("scroll")();
assert.equal(attributes["data-revealed"], "true");
assert.equal(sectionsOnly.intervals.size, 0, "reveals finish without a portrait");
assert.equal(sectionsOnly.listeners.size, 0);

delete attributes["data-revealed"];
const portrait = mount([target], target);
assert.equal(attributes["data-revealed"], "true");
assert.equal(portrait.intervals.size, 1, "wait for the portrait wake hook");
let wakes = 0;
portrait.window.__stippleWake = () => { wakes++; };
const check = [...portrait.intervals.values()][0];
top = 2000;
check();
assert.equal(wakes, 0, "portrait must reach the viewport before waking");
assert.equal(portrait.intervals.size, 1);
top = 500;
check();
assert.equal(wakes, 1);
assert.equal(portrait.intervals.size, 0, "normal portrait completion stops polling");
assert.equal(portrait.listeners.size, 0);
console.log("reveal polling ok (empty page, sections only, portrait completion)");
