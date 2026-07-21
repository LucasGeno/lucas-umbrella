import { shouldReveal } from "./reveal.mjs";
import assert from "node:assert/strict";

const H = 1000;

// Threshold is viewport * 1.4 → 1400 for H=1000.
assert.equal(shouldReveal({ top: 1399, bottom: 1900 }, H), true,  "just inside 1.4× threshold");
assert.equal(shouldReveal({ top: 1401, bottom: 1900 }, H), false, "just past 1.4× threshold → hidden");
assert.equal(shouldReveal({ top: -500, bottom:  -50 }, H), false, "scrolled past → hidden");
assert.equal(shouldReveal({ top: -100, bottom:  100 }, H), true,  "straddling top → visible");
assert.equal(shouldReveal({ top:    0, bottom:   50 }, H), true,  "loaded already in view");

console.log("shouldReveal ok");
