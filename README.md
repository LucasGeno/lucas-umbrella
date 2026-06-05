# lucas-umbrella

Static umbrella landing at `https://lucasreed.me/` — the Plaque Rooms carousel.

Deploys to `lucas-platform` (`/opt/platform/umbrella/`) on push to `main` via the
GitHub Actions workflow in `.github/workflows/deploy.yml`. The platform's Caddy
reverse proxy serves `/srv/umbrella/` at exact-match `/`.

## Local development

No build step. Open `index.html` in a browser or run a static server:

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Edit any file under `css/`, `js/`, or `index.html` and refresh. The variable
fonts under `fonts/` are loaded directly via `@font-face`.

## Architecture

See `lucas-platform/docs/designs/2026-06-05-lucas-umbrella-extraction.md` for the
extraction rationale and `lucas-platform/docs/designs/2026-06-04-plaque-rooms-concept.md`
for the rooms vision.
