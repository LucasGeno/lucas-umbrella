import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");

assert.match(html, /class="plaque-section" href="\/chromacut\/?"/);
assert.match(
  html,
  /class="umbrella-index__name">\/chromacut<\/span>/,
);

console.log("index links ok");
