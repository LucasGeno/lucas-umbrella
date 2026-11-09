import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

const cases = [
  { name: "migration write fails", legacy: "dark", fail: "set", expected: "dark" },
  { name: "shared cleanup fails", shared: "dark", legacy: "light", fail: "remove", expected: "dark" },
  { name: "migration cleanup fails", legacy: "dark", fail: "remove", expected: "dark" },
  { name: "shared dark wins", shared: "dark", legacy: "light", expected: "dark" },
  { name: "shared light wins", shared: "light", legacy: "dark", expected: "light" },
  { name: "legacy dark", legacy: "dark", expected: "dark" },
  { name: "legacy light", legacy: "light", expected: "light" },
  { name: "invalid shared falls back", shared: "invalid", legacy: "dark", expected: "dark" },
  { name: "invalid values", shared: "invalid", legacy: "invalid", expected: "light" },
  { name: "empty storage", expected: "light" },
  { name: "shared read fails", shared: "dark", fail: "theme", expected: "light" },
  { name: "legacy read fails", legacy: "dark", fail: "umbrella-theme", expected: "light" },
  { name: "storage access fails", fail: "access", expected: "light" },
];

const failures = [];
for (const file of ["index.html", "403.html", "404.html", "500.html"]) {
  const html = readFileSync(new URL(file, import.meta.url), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(script && script.index < html.indexOf('<link rel="stylesheet"'), `${file}: boots before CSS`);
  for (const c of cases) {
    const stored = new Map();
    if (c.shared !== undefined) stored.set("theme", c.shared);
    if (c.legacy !== undefined) stored.set("umbrella-theme", c.legacy);
    const expectedStorage = new Map(stored);
    const valid = (value) => value === "dark" || value === "light";
    if (!["access", "theme", "umbrella-theme", "set"].includes(c.fail)) {
      if (!valid(c.shared) && valid(c.legacy)) expectedStorage.set("theme", c.legacy);
      if (c.fail !== "remove") expectedStorage.delete("umbrella-theme");
    }
    const attributes = { "data-theme": html.match(/<html[^>]*data-theme="([^"]+)"/)[1] };
    const check = (operation) => {
      if (c.fail === operation) throw new Error(operation === "set" ? "QuotaExceededError" : "SecurityError");
    };
    const context = {
      document: { documentElement: { setAttribute: (key, value) => { attributes[key] = value; } } },
      get localStorage() {
        check("access");
        return {
          getItem(key) { check(key); return stored.get(key) ?? null; },
          setItem(key, value) { check("set"); stored.set(key, value); },
          removeItem(key) { check("remove"); stored.delete(key); },
        };
      },
    };
    try {
      runInNewContext(script[1], context, { filename: file });
      assert.equal(attributes["data-theme"], c.expected);
      assert.deepEqual(stored, expectedStorage);
    } catch (error) {
      failures.push(`${file}: ${c.name}: ${error.message}`);
    }
  }
}
assert.deepEqual(failures, []);
console.log(`theme boot ok (${cases.length * 4} cases)`);
