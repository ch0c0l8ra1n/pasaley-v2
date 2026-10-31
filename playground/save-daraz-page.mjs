// Saves a rendered Daraz product page into playground/saved/, with its scripts removed and
// the playground's chart added, so you can see the chart in a real page without the extension.
//
//   npm run playground:save                    # the first product in tests/pages.json
//   npm run playground:save -- <product url>   # any product page
//
// Uses the recording from `npm run record` when there is one for that page (nothing goes to
// Daraz), otherwise opens the live page. Images still load from Daraz's servers.
import fs from 'node:fs'
import path from 'node:path'
import { PAGES, launch, loadRecordings, open, waitFor } from '../tests/helpers.mjs'

const SAVED = new URL('./saved/', import.meta.url).pathname
const recordings = loadRecordings().filter((r) => r.kind === 'product')
const url = process.argv[2] ?? Object.values(PAGES).flatMap((pages) => pages.products)[0]
const recording = recordings.find((r) => r.url === url)

const browser = await launch('chrome', { extension: false })
const { page } = await open(browser, url, recording)
try {
  if (!(await waitFor(() => page.$('#module_product_price_1 .pdp-price')))) throw new Error('product page has no price')
  await page.waitForNetworkIdle({ timeout: 10_000 }).catch(() => {})

  const saved = await page.evaluate(() => {
    document.querySelectorAll('script, noscript, iframe, link[rel=preload], link[rel=prefetch], link[rel=modulepreload]').forEach((el) => el.remove())
    // Make links and images point at Daraz, not at the playground.
    document.querySelectorAll('[src]').forEach((el) => el.setAttribute('src', el.src))
    document.querySelectorAll('[href]').forEach((el) => el.setAttribute('href', el.href))
    return {
      html: '<!doctype html>\n' + document.documentElement.outerHTML,
      price: document.querySelector('#module_product_price_1 .pdp-price')?.textContent.trim(),
      title: document.title,
    }
  })

  // Put the recorded stylesheets in the page, so it looks right offline.
  let html = saved.html.replace(/<link[^>]+rel="stylesheet"[^>]*>/g, (link) => {
    const href = link.match(/href="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&')
    const css = recording?.responses.find((r) => r.url === href)
    return css ? `<style data-from="${href}">${Buffer.from(css.body, 'base64').toString()}</style>` : link
  })
  const id = url.match(/-i(\d+)/)[1]
  const country = new URL(url).hostname.split('.').pop()
  html = html.replace('</body>', `<script type="module" src="/daraz-page.tsx" data-product="${id}" data-country="${country}"></script></body>`)

  fs.mkdirSync(SAVED, { recursive: true })
  const file = path.join(SAVED, `${country}-${id}.html`)
  fs.writeFileSync(file, html)
  console.log(`Saved ${saved.title} (${saved.price}) to ${path.relative(process.cwd(), file)}`)
  console.log(`Open it with \`npm run playground\`, then http://localhost:5174/saved/${country}-${id}.html`)
} finally {
  await browser.close()
}
