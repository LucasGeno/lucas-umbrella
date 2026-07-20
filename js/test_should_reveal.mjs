import { shouldReveal } from "./reveal.mjs";
import assert from "node:assert/strict";

const H = 1000;

assert.equal(shouldReveal({ top: 800, bottom: 1200 }, H), true,  "in view at 88% threshold");
assert.equal(shouldReveal({ top: 900, bottom: 1400 }, H), false, "below 88% cutoff → hidden");
assert.equal(shouldReveal({ top: -500, bottom: -50 }, H), false, "scrolled past → hidden");
assert.equal(shouldReveal({ top: -100, bottom:  100 }, H), true,  "straddling top → visible");
assert.equal(shouldReveal({ top:    0, bottom:   50 }, H), true,  "loaded already in view");

console.log("shouldReveal ok");
