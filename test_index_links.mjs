import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { assertChipSlot } from "./test_chip_slot.mjs";

const html = readFileSync("index.html", "utf8");

// The hero is a curated shortlist; the full index remains the directory.
const hero = html.match(/<nav class="plaque-section-line"[^>]*>([\s\S]*?)<\/nav>/)[1];
const heroLinks = [...hero.matchAll(/<a class="plaque-section" href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
assert.ok(heroLinks.length > 0 && heroLinks.length <= 4, "hero shows one to four links");
assert.deepEqual(heroLinks.map((link) => link[2]), ["/tech", "/farmcore", "/news", "/hereloop"]);

const index = html.match(/<ol class="umbrella-index__list">([\s\S]*?)<\/ol>/)[1];
const indexLinks = [...index.matchAll(/<a href="([^"]+)">[\s\S]*?class="umbrella-index__name">([^<]+)<\/span>/g)];
assert.equal(indexLinks[1][1], "https://farmcore.lucasreed.me/");
assert.equal(indexLinks[1][2], "/farmcore");
for (const [, href, label] of heroLinks) {
  assert.ok(indexLinks.some((link) => link[1] === href && link[2] === label), `${label} matches its full index entry`);
}
assert.match(
  html,
  /class="umbrella-index__name">\/chromacut<\/span>/,
);

assertChipSlot(html, "index.html");
assert.ok(!html.includes("identity-chip-wrap--floating"), "index.html has no floating chip");
assert.match(html, /getItem\("theme"\)/, "index.html boots from the shared theme key");

console.log("index links ok");
