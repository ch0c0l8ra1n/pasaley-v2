// What differs between the production, staging, dev and local builds of the extension.
import fs from 'fs'
import os from 'os'
import path from 'path'
import { loadEnv, type Plugin } from 'vite'

const labels: Record<string, string> = { production: '', staging: 'Staging', development: 'Dev', personal: 'Local' }

export function outDir(mode: string) {
  if (!(mode in labels)) throw new Error(`Unknown build mode "${mode}". Use production, staging, development or personal.`)
  if (!loadEnv(mode, process.cwd()).VITE_API_URL) {
    throw new Error(`VITE_API_URL is not set for the ${mode} build. Put it in .env.${mode}.local or the environment.`)
  }
  // Outside the repo: Chrome keeps pointing at it, from any branch or worktree.
  if (mode === 'personal') return path.join(os.homedir(), 'pasaley-local-extension')
  return mode === 'production' ? 'dist' : `dist-${labels[mode].toLowerCase()}`
}

// Production ships public/manifest.json as is. The others get their own name and
// Firefox ID, so they can be installed next to the production extension.
export function manifest(mode: string): Plugin {
  return {
    name: 'pasaley-manifest',
    apply: 'build',
    writeBundle(options) {
      if (mode === 'production') return
      const manifest = JSON.parse(fs.readFileSync('public/manifest.json', 'utf8'))
      manifest.name = `Pasaley (${labels[mode]})`
      manifest.browser_specific_settings.gecko.id = `pasaley-${labels[mode].toLowerCase()}@pm.me`
      fs.writeFileSync(path.join(options.dir!, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
    },
  }
}
