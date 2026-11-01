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

## Chart playground

A local page for working on the price chart, with mock price history instead of the API:

```bash
npm run playground
```

- http://localhost:5174 shows the extension's chart on its own, with a choice of price histories (eight months, a new listing, a stable price, no history), widths and a slow API.
- `npm run playground:save` saves a rendered Daraz product page into `playground/saved/` (not committed), with the chart added to its price section as the extension does. Open it from the playground's front page. With no URL it saves the first product in `tests/pages.json`, from the recording if `npm run record` has made one; `npm run playground:save -- <product url>` saves any other.

Both render the real chart component (`src/content-scripts/chart/ChartApp.tsx`) in a shadow root, as the extension does. Edits to the chart or its CSS show up straight away.

## Testing in Chrome and Firefox

These tests run on your computer, not in CI. They need Google Chrome and Firefox installed. They load the built extension (`dist/`) into each browser, open Daraz pages, and check that:

- **Homepage:** the products embedded in the page (`window.__FIRST_SCREEN_DATA`) are sent to the API, and every product sent is one of them.
- **Search page:** the products from Daraz's product list request (`catalog/?ajax=true`) are sent, for page 1 and again after going to page 2.
- **Product page:** the price chart is added to the price section with its header, tabs and styles. It asks the API for this product's price history (right `id` and `hostCountry`) and draws it: the price axis and the line match the prices the API returned.
- **Every page:** the page-world script is running.

The tests answer calls to the Pasaley API themselves, so nothing reaches the real API.

There are two ways to run them:

**Replica (recorded Daraz pages).** Record today's pages once, then test against the recording as often as you like. Nothing goes to Daraz, so captchas and Daraz changes don't affect it.

```bash
npm run record
```

```bash
npm run test:replica
```

Recordings are saved in `tests/recordings/` (not committed, about 150 MB) and are re-recorded whenever you run `npm run record`. If Daraz shows a captcha while recording, run `SHOW=1 npm run record` and solve it in the window.

**Live Daraz.** Tests the real site, to catch Daraz changes that would break the extension.

```bash
npm run test:live
```

If Daraz shows a captcha, that page is skipped. If Daraz has changed something the extension relies on, the failure says `Daraz page changed: ...`.

The pages are listed in `tests/pages.json`. Product pages are also taken from the search results.

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

The release job runs in the `stores` environment, which holds the store keys and needs an approval before it runs. A store whose keys are not set is skipped.

Both stores review every submission, so a release goes live when it passes review (usually hours on Chrome, can be longer on Firefox). Re-running a release skips any store that already has the version.
