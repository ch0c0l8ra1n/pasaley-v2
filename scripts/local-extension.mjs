// Builds "Pasaley (Local)" into a fixed folder for your own Chrome, which then
// reloads it by itself (scripts/local-reload.js). Runs after every `npm run
// build` except in CI, so what's released to the stores never contains this.
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

if (process.env.CI) process.exit(0)

const dir = path.join(os.homedir(), 'pasaley-local-extension')

const build = () => {
  for (const config of ['vite.interceptor.config.ts', 'vite.chartApp.config.ts']) {
    execSync(`npx vite build -c ${config} --mode personal --logLevel warn`, { stdio: 'inherit' })
  }
  fs.copyFileSync('scripts/local-reload.js', path.join(dir, 'local-reload.js'))

  const manifestFile = path.join(dir, 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
  manifest.background = { service_worker: 'local-reload.js' }
  manifest.permissions.push('alarms', 'tabs')
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n')

  // Last, so the reload only happens once everything else is in place.
  fs.writeFileSync(path.join(dir, 'build-id.txt'), String(Date.now()))
}

const installedInChrome = () => {
  const chromeDir = path.join(os.homedir(), 'Library/Application Support/Google/Chrome')
  if (!fs.existsSync(chromeDir)) return false
  return fs.readdirSync(chromeDir).some((profile) =>
    ['Secure Preferences', 'Preferences'].some((file) => {
      const prefs = path.join(chromeDir, profile, file)
      return fs.existsSync(prefs) && fs.readFileSync(prefs, 'utf8').includes(dir)
    }))
}

// Chrome can't be told to install an unpacked extension, so ask once. An
// explicit `npm run build:local` always asks.
const askToInstall = () => {
  console.log(`\nPasaley (Local) isn't in your Chrome yet. On chrome://extensions, turn on Developer mode, click "Load unpacked" and pick:\n  ${dir}\nThen turn off the store version, or every page gets reported twice.\n`)
  const asked = path.join(dir, '.install-asked')
  if (fs.existsSync(asked) && process.env.npm_lifecycle_event !== 'build:local') return
  fs.writeFileSync(asked, '')
  if (process.platform === 'darwin') execSync('open -a "Google Chrome" "chrome://extensions"')
}

// A problem here must not fail the build it follows.
try {
  build()
  console.log(`Pasaley (Local) updated in ${dir}`)
  if (!installedInChrome()) askToInstall()
} catch (err) {
  console.warn(`Pasaley (Local) wasn't updated: ${err.message}`)
}
