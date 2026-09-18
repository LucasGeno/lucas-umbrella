# lucas-umbrella

Static umbrella landing at `https://lucasreed.me/` — the Plaque hero, with
About / Index / Contact museum-label sections scrolling below.

The platform's Caddy reverse proxy serves `/srv/umbrella/` at exact-match `/`,
from `/opt/platform/umbrella/` on the `lucas-platform` droplet.

**Pushing to `main` does not deploy.** A GitHub Actions workflow exists
(`.github/workflows/deploy.yml`) and is meant to rsync the repo there on push,
but its `TS_OAUTH_CLIENT_ID` / `TS_OAUTH_SECRET` / `DEPLOY_KEY` secrets were
never provisioned. The live site is there by manual rsync (cutover 2026-07-21,
last content push 2026-07-30) and has not moved since — verified 2026-09-18:
every file under `/opt/platform/umbrella/` still carries its Jul 30 mtime. Either
provision the secrets or rsync by hand from `ssh platform`; don't assume a push
went live.

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
