import assert from "node:assert/strict";

// The identity chip slot every plaque page ships: inside .plaque-chrome, left
// of the theme toggle, and a working Sign in link before identity-chip.js runs
// (data-state="loading" is what the hydrator looks for). No data-authed-only:
// signed-out visitors keep the link.
export function assertChipSlot(html, file) {
  const chrome = html.match(/<div class="plaque-chrome">([\s\S]*?)<button class="theme-toggle"/);
  assert.ok(chrome, `${file} chip slot sits in .plaque-chrome before the toggle`);
  assert.match(
    chrome[1],
    /<div class="identity-chip-wrap">\s*<a class="identity-chip" href="\/login\?next=\/" data-state="loading">Sign in<\/a>\s*<\/div>/,
    `${file} chip placeholder is a real Sign in link`,
  );
  assert.ok(!html.includes("data-authed-only"), `${file} does not hide the chip from signed-out visitors`);
  assert.ok(!html.includes("_guest.png"), `${file} has no guest image`);
  assert.match(html, /href="\/static\/_shared\/identity-chip\.css(\?v=\d+)?"/, `${file} loads the chip styles`);
}
