// Shared by the browser tests and the recorder: launching browsers, opening pages with
// the Pasaley API answered by the test, replaying recorded Daraz pages, and the checks.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

export const API = process.env.API_URL ?? 'https://www.pasaley.com/api/v2'
export const EXTENSION = path.resolve(process.env.EXTENSION_DIR ?? 'dist')
export const PAGES = JSON.parse(fs.readFileSync(new URL('./pages.json', import.meta.url)))
export const RECORDINGS = new URL('./recordings/', import.meta.url).pathname
export const BROWSERS = (process.env.BROWSERS ?? 'chrome,firefox').split(',')
const HEADLESS = !process.env.SHOW

export async function launch(name, { extension = true } = {}) {
  if (name === 'chrome') {
    return puppeteer.launch({
      executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: HEADLESS,
      pipe: true,
      enableExtensions: extension ? [EXTENSION] : false,
    })
  }
  const browser = await puppeteer.launch({
    browser: 'firefox',
    executablePath: process.env.FIREFOX_PATH ?? '/Applications/Firefox.app/Contents/MacOS/firefox',
    headless: HEADLESS,
    // Start a separate Firefox even if you already have one open.
    args: ['--no-remote', '--new-instance'],
  })
  if (extension) await browser.installExtension(EXTENSION)
  return browser
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function waitFor(check, timeout = 30_000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    const value = await check()
    if (value) return value
    await sleep(500)
  }
  return null
}

export const countryOf = (url) => new URL(url).hostname.split('.').pop()
export const kindOf = (url) =>
  /\/products\/.*-i\d+/.test(url) ? 'product' : new URL(url).pathname.startsWith('/catalog') ? 'search' : 'home'

// Every itemId anywhere in a JSON value, as strings.
export function itemIds(value, ids = new Set()) {
  if (Array.isArray(value)) value.forEach((v) => itemIds(v, ids))
  else if (value && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) {
      if (key === 'itemId' && v != null && typeof v !== 'object') ids.add(String(v))
      else itemIds(v, ids)
    }
  }
  return ids
}

function parseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Price history the mocked API returns: distinctive prices, all in the last month,
// so the chart (which opens on the last month) shows them.
const day = 24 * 60 * 60 * 1000
export const PRICES = [
  { time: new Date(Date.now() - 20 * day).toISOString(), price: 4321 },
  { time: new Date(Date.now() - 10 * day).toISOString(), price: 3999 },
  { time: new Date(Date.now() - 3 * day).toISOString(), price: 4150 },
]

// Opens a page in a new tab. Calls to the Pasaley API are answered with mock data and
// collected in apiCalls. Daraz responses that list products are collected in productLists.
// With a recording, every other request is answered from it, so nothing goes to Daraz either.
export async function open(browser, url, recording) {
  const page = await browser.newPage()
  const apiCalls = []
  const productLists = []
  const served = recording && new Replay(recording)

  await page.setRequestInterception(true)
  page.on('request', async (request) => {
    if (request.url().startsWith(API)) return answerApi(page, request, apiCalls)
    if (!served) return request.continue()
    if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers: allowCors(request) })

    const response = served.find(request)
    if (!response) return request.respond({ status: 404, body: '' })
    request.respond({ status: response.status, headers: response.headers, body: Buffer.from(response.body, 'base64') })
  })
  page.on('response', async (response) => {
    if (!response.headers()['content-type']?.includes('json') || response.url().startsWith(API)) return
    const json = parseJson(await response.text().catch(() => ''))
    const ids = itemIds(json)
    if (ids.size > 0) productLists.push({ url: response.url(), ids })
  })

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  return { page, apiCalls, productLists }
}

async function answerApi(page, request, apiCalls) {
  const headers = {
    'Access-Control-Allow-Origin': new URL(page.url()).origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }
  if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers })

  const body = await request.fetchPostData().catch(() => undefined)
  apiCalls.push({ url: new URL(request.url()), method: request.method(), body: parseJson(body ?? '') })
  const reply = request.url().includes('/pricehistory') ? { data: { prices: PRICES } } : { ok: true }
  request.respond({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(reply) })
}

// Answers a browser's "may I send this?" (CORS preflight) check with yes. Recordings leave these out.
function allowCors(request) {
  const headers = request.headers()
  return {
    'Access-Control-Allow-Origin': headers.origin ?? '*',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': headers['access-control-request-method'] ?? 'GET, POST',
    'Access-Control-Allow-Headers': headers['access-control-request-headers'] ?? '*',
  }
}

// Finds the recorded response for a request: same method and URL, or else the same
// method and path (for URLs with timestamps or tokens in them), page loads matched to page loads.
class Replay {
  constructor(recording) {
    this.responses = recording.responses
  }

  find(request) {
    const url = new URL(request.url())
    const same = (r) => r.method === request.method() && new URL(r.url).origin === url.origin && new URL(r.url).pathname === url.pathname
    const navigation = request.isNavigationRequest()
    return this.responses.find((r) => r.method === request.method() && r.url === request.url())
      ?? this.responses.find((r) => same(r) && (r.type === 'document') === navigation)
  }
}

export function loadRecordings() {
  if (!fs.existsSync(RECORDINGS)) return []
  return fs.readdirSync(RECORDINGS)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(RECORDINGS, file), 'utf8')))
}

// The first product linked from a page, without its query string.
export async function firstProductLink(page) {
  const link = await waitFor(() => page.evaluate(() =>
    [...document.querySelectorAll('a[href*="/products/"]')].map((a) => a.href).find((href) => /-i\d+/.test(href))))
  return link?.split('?')[0]
}

// Clicks the search page's next page button. A DOM click, because Puppeteer's mouse
// click misses it in Firefox. Returns false if there is no such button.
export const goToNextPage = (page) => page.evaluate(() => {
  const button = document.querySelector('.ant-pagination-next:not(.ant-pagination-disabled) button')
  button?.click()
  return !!button
})

// Daraz sometimes shows a captcha ("slide to verify") instead of the page.
export const captchaShown = (page) => page.evaluate(() =>
  location.pathname.includes('_____tmd_____') ||
  !!document.querySelector('#nocaptcha, .nc_wrapper, #baxia-dialog-content, .baxia-dialog, iframe[src*="_____tmd_____"], iframe[src*="punish"]'))

// True when the page-world script has replaced XMLHttpRequest.open.
const interceptorRunning = (page) =>
  page.evaluate(() => !XMLHttpRequest.prototype.open.toString().includes('[native code]'))

const listCalls = (apiCalls) => apiCalls.filter((c) => c.url.pathname.endsWith('/listitemsapi'))

// Waits for a list of products to be sent to the API whose products all come from `source`.
async function expectItemsSent(page, apiCalls, source, where) {
  const call = await waitFor(() => listCalls(apiCalls).find((c) => {
    const sent = (c.body?.listItems ?? []).map((item) => String(item.itemId))
    return sent.length > 0 && sent.every((id) => source.has(id))
  }))
  const seen = listCalls(apiCalls).map((c) => c.body?.listItems?.length ?? 0)
  assert.ok(call, `no products from ${where} were sent to ${API}/listitemsapi (sent lists of sizes: [${seen}])`)
  assert.equal(call.method, 'POST')
  assert.equal(call.body.href, page.url())
  return call
}

// Daraz's homepage has products in window.__FIRST_SCREEN_DATA, which the extension reads.
export async function checkHomePage({ page, apiCalls }) {
  assert.ok(await interceptorRunning(page), 'page-world script is not running')
  const ids = new Set(await page.evaluate(() => {
    const found = []
    const walk = (v) => {
      if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) k === 'itemId' ? found.push(String(x)) : walk(x)
    }
    walk(window.__FIRST_SCREEN_DATA)
    return found
  }))
  assert.ok(ids.size > 0, 'Daraz page changed: the homepage has no products in window.__FIRST_SCREEN_DATA')
  await expectItemsSent(page, apiCalls, ids, 'the products embedded in the homepage')
}

// Search pages load their products with background requests (catalog/?ajax=true...),
// which the extension reads as they arrive. Checks page 1 and page 2.
export async function checkSearchPage({ page, apiCalls, productLists }) {
  assert.ok(await interceptorRunning(page), 'page-world script is not running')

  const isList = (pageNumber) => (list) => list.url.includes('ajax=true') && new URL(list.url).searchParams.get('page') === pageNumber
  const first = await waitFor(() => productLists.find(isList('1')))
  assert.ok(first, 'Daraz page changed: no product list request (catalog/?ajax=true&page=1) on the search page')
  await expectItemsSent(page, apiCalls, first.ids, 'the page 1 product list')

  assert.ok(await goToNextPage(page), 'Daraz page changed: no next page button (.ant-pagination-next button) on the search page')
  const second = await waitFor(() => productLists.find(isList('2')))
  assert.ok(second, 'Daraz page changed: going to page 2 did not request catalog/?ajax=true&page=2')
  await expectItemsSent(page, apiCalls, new Set([...second.ids].filter((id) => !first.ids.has(id))), 'the page 2 product list')

  assert.equal(await page.$('#pasaley-host'), null, 'price chart should only be on product pages')
}

// Product pages get the price chart, filled with the price history from the API.
export async function checkProductPage({ page, apiCalls }, url) {
  assert.ok(await interceptorRunning(page), 'page-world script is not running')

  // The extension waits for these Daraz elements before adding the chart.
  for (const selector of ['#module_product_price_1', '.pdp-price', '.breadcrumb_item']) {
    assert.ok(await waitFor(() => page.$(selector)), `Daraz page changed: ${selector} is missing on the product page`)
  }

  const call = await waitFor(() => apiCalls.find((c) => c.url.pathname.endsWith('/pricehistory')))
  assert.ok(call, `no request to ${API}/pricehistory`)
  assert.equal(call.url.searchParams.get('id'), url.match(/-i(\d+)/)[1], 'price history asked for the wrong product')
  assert.equal(call.url.searchParams.get('hostCountry'), countryOf(url), 'price history asked for the wrong country')

  const readChart = () => page.evaluate(() => {
    const root = document.querySelector('#module_product_price_1 > #pasaley-host')?.shadowRoot
    if (!root) return null
    return {
      header: root.querySelector('header')?.textContent,
      tabs: [...root.querySelectorAll('nav .tab')].map((tab) => tab.textContent),
      styled: (root.getElementById('pasaley-root-styles')?.textContent.length ?? 0) > 0,
      drawn: !!root.querySelector('.highcharts-graph'),
      loading: !!root.querySelector('.highcharts-loading:not(.highcharts-loading-hidden)'),
      // The range buttons (1m, 3m, ...) are only shown when there is price data.
      rangeButtons: root.querySelectorAll('.highcharts-range-selector-buttons .highcharts-button').length,
      // Labels like "4k" on the price axis (not the small navigator below it).
      priceLabels: [...root.querySelectorAll('.highcharts-yaxis-labels:not(.highcharts-navigator-yaxis) text')]
        .map((label) => label.textContent.replace(/,/g, ''))
        .map((text) => parseFloat(text) * (text.endsWith('k') ? 1000 : 1)),
      // The heights the price line steps between, one per price.
      lineLevels: new Set((root.querySelector('.highcharts-series:not(.highcharts-navigator-series) .highcharts-graph')
        ?.getAttribute('d')?.match(/[ML] [\d.]+ [\d.]+/g) ?? []).map((point) => point.split(' ')[2])).size,
    }
  })
  // The price axis should reach the highest mocked price (4321) without going far past it,
  // and the line should step between the three prices.
  const prices = PRICES.map((p) => p.price)
  const showsPrices = (chart) => {
    const top = Math.max(...chart.priceLabels)
    return top >= Math.max(...prices) && top <= Math.max(...prices) * 1.5 && chart.lineLevels === new Set(prices).size
  }

  // The chart is drawn empty first and filled in when the price history arrives, so wait for that.
  const chart = await waitFor(async () => {
    const chart = await readChart()
    return chart?.drawn && !chart.loading && showsPrices(chart) ? chart : null
  }) ?? await readChart()

  assert.ok(chart, 'price chart was not added to the price section (#module_product_price_1)')
  assert.match(chart.header ?? '', /Pasaley/)
  assert.deepEqual(chart.tabs, ['Price History', 'Alerts'])
  assert.ok(chart.styled, 'chart styles are missing')
  assert.ok(chart.drawn, 'price chart was not drawn')
  assert.ok(!chart.loading, 'price chart never finished loading')
  assert.ok(chart.rangeButtons > 0, 'chart has no range buttons, so it got no price data')
  assert.ok(showsPrices(chart),
    `chart does not show the price history (${prices}): price axis [${chart.priceLabels}], line has ${chart.lineLevels} price levels`)
}

export const checks = { home: checkHomePage, search: checkSearchPage, product: checkProductPage }
