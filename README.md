# Pasaley

A browser extension that shows the price history of products on Daraz (Nepal, Pakistan, Bangladesh and Sri Lanka).

- Chrome: [Chrome Web Store](https://chromewebstore.google.com/detail/bfnanpnikodnmncpnhdolkjdpjkkhlce)
- Firefox: [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/pasaley/)

## Building from source

You need Node.js 22.

```bash
npm ci
npm run build
```

The extension is built into `dist/`. The same build works in both Chrome and Firefox.

- Chrome: open `chrome://extensions`, turn on Developer mode, click "Load unpacked" and pick `dist/`.
- Firefox: open `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on" and pick `dist/manifest.json`.

### Builds

| Command | Output | API | Name in the browser |
|---|---|---|---|
| `npm run build` | `dist/` | `https://www.pasaley.com/api/v2` | Pasaley \| Daraz Price Tracker |
| `npm run build:dev` | `dist-dev/` | `https://127.0.0.1/api/v2` | Pasaley (Dev) |
| `npm run build:staging` | `dist-staging/` | `VITE_API_URL` (see below) | Pasaley (Staging) |

Only `npm run build` is released to the stores. The dev and staging builds have their own name and Firefox ID, so you can install them next to the released extension.

The API address comes from `.env.production` and `.env.development`. The staging build has no default: put `VITE_API_URL=...` in `.env.staging.local` (not committed) or set it in the environment. `npm run dev` uses the dev API too.

Other scripts: `npm run lint`, `npm run lint:firefox` (checks `dist/` with `web-ext lint`), `npm run zip` (zips `dist/` into `pasaley.zip`).

## Testing in Chrome and Firefox

These tests run on your computer, not in CI. They need Google Chrome and Firefox installed.

```bash
npm run test:browsers
```

This builds the extension, then opens the Daraz pages in `tests/pages.json` in both browsers with `dist/` loaded. For each country it checks that:

- search pages send the listed items to the API;
- product pages show the price chart in the price section, with its header, tabs and styles, after asking the API for that product's price history;
- the page-world script is running.

The test answers the API calls itself, so nothing reaches the real API. Product pages are taken from the search results, so they stay current. You can also list specific ones in `tests/pages.json`.

Options (environment variables):

- `BROWSERS=chrome` or `BROWSERS=firefox` to test one browser.
- `SHOW=1` to watch the browsers instead of running them headless.
- `EXTENSION_DIR=dist-dev API_URL=https://127.0.0.1/api/v2` to test another build. Run `npm run build:dev` first. `API_URL` must match the build.
- `CHROME_PATH` and `FIREFOX_PATH` if the browsers aren't in `/Applications`.

## Releasing

Every pull request and push to `main` is linted and built by the CI workflow.

To release a new version:

1. Bump `version` in `public/manifest.json` and merge that to `main`.
2. Dry run: go to Actions → Release → Run workflow, leave "publish" off. It builds, lints and checks that it can sign in to both stores, but submits nothing.
3. Release: run it again with "publish" on. It submits the new version to Firefox Add-ons (with the source code) and the Chrome Web Store, then creates a GitHub release with both zips.

Or from a terminal:

```bash
gh workflow run release.yml -f publish=false
```

```bash
gh workflow run release.yml -f publish=true
```

The release job runs in the `stores` environment, which holds the store keys and needs an approval before it runs.

Both stores review every submission, so a release goes live when it passes review (usually hours on Chrome, can be longer on Firefox). Re-running a release skips any store that already has the version.
