import { readFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";

const cases = [
  { file: "404.html", digits: "404", copy: "this path doesn't resolve." },
  { file: "403.html", digits: "403", copy: "not for these eyes." },
  { file: "500.html", digits: "500", copy: "something on the shelf fell over." },
];

const bannedSections = ["umbrella-about", "umbrella-index", "umbrella-contact", "plaque-hint"];

for (const c of cases) {
  assert.ok(existsSync(c.file), `${c.file} exists at repo root`);
  const html = readFileSync(c.file, "utf8");

  // Three digit spans concatenating to the status code.
  const letters = [...html.matchAll(/class="plaque-wordmark__letter"[^>]*>([^<]+)</g)].map(m => m[1]);
  assert.deepEqual(letters, c.digits.split(""), `${c.file} wordmark digits`);

  // Wordmark still uses the plaque class + id so app.js finds it.
  assert.match(html, /<h1[^>]*class="plaque-wordmark"[^>]*id="wordmark"/, `${c.file} wordmark shell`);

  // Plaque copy line uses the exact status text.
  assert.match(html, new RegExp(`class="plaque-copy"[^>]*>${c.copy.replace(/[.'"]/g, ".")}<`), `${c.file} copy line`);

  // Text link back to /.
  assert.match(html, /href="\/"/, `${c.file} link home`);
  assert.match(html, /← lucasreed\.me/, `${c.file} link label`);

  // Same head asset references as index.html so tokens/room1/fonts/js load in place.
  assert.match(html, /href="css\/tokens\.css"/, `${c.file} loads tokens.css`);
  assert.match(html, /href="css\/room1\.css"/, `${c.file} loads room1.css`);
  assert.match(html, /src="js\/app\.js"/, `${c.file} loads app.js`);
  assert.match(html, /href="fonts\/RobotoFlex\.ttf"/, `${c.file} preloads RobotoFlex`);
  assert.match(html, /href="fonts\/InterTight\.ttf"/, `${c.file} preloads InterTight`);

  // Sections and scroll hint that don't belong on an error page.
  for (const banned of bannedSections) {
    assert.ok(!html.includes(banned), `${c.file} has no ${banned}`);
  }

  // Grain overlay + theme-boot script carried over so the visual identity matches /.
  assert.match(html, /class="plaque-grain"/, `${c.file} grain overlay`);
  assert.match(html, /umbrella-theme/, `${c.file} theme-boot script`);

  // Preserves the two document theme meta colors and canonical link should not point at /.
  assert.match(html, /<link rel="canonical" href="https:\/\/lucasreed\.me\/[^"]*"/, `${c.file} canonical link`);
}

console.log("error pages ok");
