// Records today's Daraz pages from tests/pages.json into tests/recordings/, for the
// replica tests (`npm run test:replica`) to serve instead of the live site.
//
//   npm run record              # all countries
//   SHOW=1 npm run record       # watch it, and solve a captcha yourself if Daraz shows one
//
// Records with Chrome and without the extension. Images, fonts and media are left out.
import fs from 'node:fs'
import path from 'node:path'
import { PAGES, RECORDINGS, captchaShown, firstProductLink, goToNextPage, kindOf, launch, waitFor } from './helpers.mjs'

const SKIPPED_TYPES = new Set(['image', 'media', 'font'])
const KEPT_HEADERS = ['content-type', 'location', 'access-control-allow-origin', 'access-control-allow-credentials']

async function record(browser, url) {
  const page = await browser.newPage()
  const responses = []
  page.on('response', async (response) => {
    const request = response.request()
    if (SKIPPED_TYPES.has(request.resourceType()) || request.method() === 'OPTIONS') return
    const body = await response.buffer().catch(() => Buffer.alloc(0)) // redirects have no body
    const headers = Object.fromEntries(Object.entries(response.headers()).filter(([key]) => KEPT_HEADERS.includes(key)))
    responses.push({ method: request.method(), url: response.url(), type: request.resourceType(), status: response.status(), headers, body: body.toString('base64') })
  })

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 })
    if (await captchaShown(page)) {
      if (!process.env.SHOW) throw new Error('Daraz showed a captcha. Run with SHOW=1 to solve it yourself.')
      console.log('  Daraz showed a captcha: solve it in the browser window (2 minutes).')
      if (!(await waitFor(async () => !(await captchaShown(page)), 120_000))) throw new Error('captcha was not solved')
      await page.waitForNetworkIdle({ timeout: 30_000 }).catch(() => {})
    }

    const kind = kindOf(url)
    let product
    if (kind === 'search') {
      product = await firstProductLink(page)
      // Record page 2 as well, which the tests go to.
      if (!(await goToNextPage(page))) throw new Error('search page has no next page button')
      await page.waitForNetworkIdle({ timeout: 30_000 }).catch(() => {})
    } else if (kind === 'product') {
      const ready = await waitFor(() => page.$('#module_product_price_1 .pdp-price'))
      if (!ready) throw new Error('product page has no price (#module_product_price_1 .pdp-price)')
    } else {
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }

    const file = `${new URL(url).hostname.split('.').pop()}-${kind}${kind === 'product' ? '-' + url.match(/-i(\d+)/)[1] : ''}.json`
    fs.writeFileSync(path.join(RECORDINGS, file), JSON.stringify({ url, kind, recordedAt: new Date().toISOString(), responses }))
    console.log(`  saved ${file} (${responses.length} responses)`)
    return product
  } finally {
    await page.close()
  }
}

fs.mkdirSync(RECORDINGS, { recursive: true })
const browser = await launch('chrome', { extension: false })
let failed = 0
for (const [country, pages] of Object.entries(PAGES)) {
  console.log(`daraz .${country}`)
  const urls = [pages.home, pages.search, ...pages.products]
  for (let i = 0; i < urls.length; i++) {
    try {
      const product = await record(browser, urls[i])
      if (product && !urls.includes(product)) urls.push(product)
    } catch (err) {
      failed++
      console.log(`  could not record ${urls[i]}: ${err.message}`)
    }
  }
}
await browser.close()
process.exit(failed ? 1 : 0)
