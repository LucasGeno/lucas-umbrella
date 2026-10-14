import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { assertChipSlot } from "./test_chip_slot.mjs";

const html = readFileSync("index.html", "utf8");

assert.match(html, /class="plaque-section" href="\/chromacut\/?"/);
assert.match(
  html,
  /class="umbrella-index__name">\/chromacut<\/span>/,
);

assertChipSlot(html, "index.html");
assert.ok(!html.includes("identity-chip-wrap--floating"), "index.html has no floating chip");
assert.match(html, /getItem\("theme"\)/, "index.html boots from the shared theme key");

console.log("index links ok");
