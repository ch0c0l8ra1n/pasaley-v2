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

Other scripts: `npm run lint`, `npm run lint:firefox` (checks `dist/` with `web-ext lint`), `npm run zip` (zips `dist/` into `pasaley.zip`).

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
