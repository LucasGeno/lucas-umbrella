# CLAUDE.md — lucas-umbrella

Static umbrella landing served at `lucasreed.me/` — the Plaque hero (massive
wordmark, cursor gravity, stipple portrait) with About / Index / Contact
museum-label sections scrolling below. Hand-written HTML/CSS/JS. **No build
step, no package.json, no dependencies.**

## Layout

| Path | What |
|---|---|
| `index.html` | the whole page — plaque, section nav, index list, colophon |
| `404.html` / `403.html` / `500.html` | plaque-styled error pages; the wordmark is the status digits |
| `css/tokens.css` | design tokens (light + dark) |
| `css/room1.css` | all page styling |
| `js/app.js` | theme toggle, cursor gravity, entrance stagger, clock, touch response |
| `js/stipple-portrait.js` | canvas stipple render of `portrait.png` |
| `fonts/` | RobotoFlex + InterTight variable fonts, loaded via `@font-face` and preloaded |

## Local preview

```bash
python3 -m http.server 8080
```

Serve it — don't `file://` it. The identity chip and shared assets use
absolute paths, and the fonts need a real origin.

Tests are plain `node:assert` scripts, no runner:

```bash
node test_index_links.mjs && node test_error_pages.mjs && node js/test_should_reveal.mjs
```

## Deploy

`.github/workflows/deploy.yml` rsyncs the repo over Tailscale to
`deploy@platform:/opt/platform/umbrella/` on push to `main`. Caddy serves it
from `/srv/umbrella/` at exact-match `/` plus `/css/*`, `/js/*`, `/fonts/*`,
`/favicon.svg`, `/portrait.png` (the `@umbrella_owned` matcher). Cutover landed
2026-07-21.

**Gotcha:** `lucas-platform/AGENTS.md` records that the workflow's Tailscale
OAuth and `DEPLOY_KEY` secrets were never provisioned — the live deploy was a
manual rsync. Confirm the Actions run actually succeeded before assuming a push
went live; otherwise rsync by hand from `ssh platform`.

## Gotchas

- `/static/_shared/identity-chip.{css,js}` and `/static/_guest.png` come from
  the platform's FastAPI admin app, not this repo. They 404 under a local
  static server — the chip silently stays in its `loading` state. Expected.
- The error pages share the plaque markup and `id="wordmark"` so `app.js`
  animates them; `test_error_pages.mjs` asserts that shape and the absence of
  the scroll-below sections. Keep both in sync when the plaque changes.
- Theme boots from an inline script reading `localStorage["umbrella-theme"]`
  before CSS applies. Default is light via `html[data-theme]`; don't move that
  script below the stylesheets or returning dark visitors get a flash.
- This page opts out of the platform's `umbrella-bar` — it *is* home.
- Cloudflare fronts the site; after a content-shape change run
  `lucas-platform/scripts/purge-cloudflare-cache.sh`.

## Also see

- `README.md` — the same ground, for humans
- `lucas-platform/AGENTS.md` — routing authority, Caddy gotchas
- Design rationale: `lucas-platform/docs/designs/2026-06-05-lucas-umbrella-extraction.md`
  and `2026-06-04-plaque-rooms-concept.md`
