// Opens Daraz pages in the Chrome and Firefox installed on this computer, with the
// built extension (dist/) loaded, and checks that it works. Calls to the Pasaley API
// are answered by the test itself, so nothing is sent anywhere.
//
//   npm run test:browsers                       # build, then test both browsers
//   BROWSERS=firefox npm run test:browsers      # just one
//   SHOW=1 npm run test:browsers                # watch the browsers instead of running headless
//
// The pages to open are in tests/pages.json.
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const API = process.env.API_URL ?? 'https://www.pasaley.com/api/v2'
const EXTENSION = path.resolve(process.env.EXTENSION_DIR ?? 'dist')
const PAGES = JSON.parse(fs.readFileSync(new URL('./pages.json', import.meta.url)))
const HEADLESS = !process.env.SHOW

const browsers = {
  chrome: {
    executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    pipe: true,
    enableExtensions: [EXTENSION],
  },
  firefox: {
    browser: 'firefox',
    executablePath: process.env.FIREFOX_PATH ?? '/Applications/Firefox.app/Contents/MacOS/firefox',
    // Start a separate Firefox even if you already have one open.
    args: ['--no-remote', '--new-instance'],
  },
}

const PRICES = [
  { time: '2026-01-01T00:00:00.000Z', price: 1500 },
  { time: '2026-02-01T00:00:00.000Z', price: 1350 },
  { time: '2026-03-01T00:00:00.000Z', price: 1420 },
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(check, timeout = 30_000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    const value = await check()
    if (value) return value
    await sleep(500)
  }
  return null
}

// Opens a page with the API mocked. Returns the page and the API requests it made.
async function open(browser, url) {
  const page = await browser.newPage()
  const apiCalls = []
  await page.setRequestInterception(true)
  page.on('request', async (request) => {
    if (!request.url().startsWith(API)) return request.continue()

    const origin = new URL(page.url()).origin
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    }
    if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers })

    const body = await request.fetchPostData().catch((err) => `could not read the request body: ${err.message}`)
    apiCalls.push({ url: new URL(request.url()), method: request.method(), body })
    const reply = request.url().includes('/pricehistory') ? { data: { prices: PRICES } } : { ok: true }
    request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(reply) })
  })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  return { page, apiCalls }
}

// True when the page-world script has replaced XMLHttpRequest.open.
const interceptorRunning = (page) =>
  page.evaluate(() => !XMLHttpRequest.prototype.open.toString().includes('[native code]'))

for (const [name, options] of Object.entries(browsers)) {
  const wanted = (process.env.BROWSERS ?? 'chrome,firefox').split(',')
  describe(name, { skip: !wanted.includes(name) }, () => {
    let browser
    const productPages = [...PAGES.products]

    before(async () => {
      browser = await puppeteer.launch({ ...options, headless: HEADLESS })
      if (name === 'firefox') await browser.installExtension(EXTENSION)
    })
    after(() => browser?.close())

    for (const url of PAGES.search) {
      test(`search page sends the listed items: ${url}`, async () => {
        const { page, apiCalls } = await open(browser, url)
        try {
          // Use the first product on the page for the product page tests.
          const product = await waitFor(() => page.evaluate(() =>
            [...document.querySelectorAll('a[href*="/products/"]')].map((a) => a.href).find((href) => /-i\d+/.test(href))))
          if (product) productPages.push(product.split('?')[0])

          assert.ok(await interceptorRunning(page), 'page-world script is not running')

          const call = await waitFor(() => apiCalls.find((c) => c.url.pathname.endsWith('/listitemsapi')))
          assert.ok(call, `no request to ${API}/listitemsapi`)
          assert.equal(call.method, 'POST')
          const body = JSON.parse(call.body)
          assert.ok(Array.isArray(body.listItems) && body.listItems.length > 0, 'listItems is empty')
          assert.equal(body.href, page.url())

          assert.equal(await page.$('#pasaley-host'), null, 'price chart should only be on product pages')

        } finally {
          await page.close()
        }
      })
    }

    // Product pages found on the search pages are added while the tests run, so check them
    // one by one in a single test per country.
    for (const country of ['np', 'pk', 'bd', 'lk']) {
      test(`product page shows the price chart: daraz .${country}`, async (t) => {
        const urls = productPages.filter((url) => new URL(url).hostname.endsWith(`.${country}`))
        if (urls.length === 0) return t.skip('no product page found or listed for this country')

        for (const url of urls) {
          await t.test(url, async () => {
            const { page, apiCalls } = await open(browser, url)
            try {
              assert.ok(await interceptorRunning(page), 'page-world script is not running')

              const call = await waitFor(() => apiCalls.find((c) => c.url.pathname.endsWith('/pricehistory')))
              assert.ok(call, `no request to ${API}/pricehistory`)
              const productId = url.match(/-i(\d+)/)[1]
              assert.equal(call.url.searchParams.get('id'), productId)
              assert.equal(call.url.searchParams.get('hostCountry'), country)

              const chart = await waitFor(() => page.evaluate(() => {
                const host = document.querySelector('#module_product_price_1 > #pasaley-host')
                const root = host?.shadowRoot
                const loading = root?.querySelector('.highcharts-loading:not(.highcharts-loading-hidden)')
                if (!root?.querySelector('.highcharts-graph') || loading) return null
                return {
                  header: root.querySelector('header')?.textContent,
                  tabs: [...root.querySelectorAll('nav .tab')].map((tab) => tab.textContent),
                  styled: (root.getElementById('pasaley-root-styles')?.textContent.length ?? 0) > 0,
                }
              }))
              assert.ok(chart, 'price chart did not appear in the price section, or never finished loading')
              assert.match(chart.header, /Pasaley/)
              assert.deepEqual(chart.tabs, ['Price History', 'Alerts'])
              assert.ok(chart.styled, 'chart styles are missing')
            } finally {
              await page.close()
            }
          })
        }
      })
    }
  })
}
