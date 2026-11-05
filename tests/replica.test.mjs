// Serves the Daraz pages recorded by `npm run record` (in tests/recordings/) to Chrome and
// Firefox with the extension loaded, and checks that it works. Nothing goes to Daraz or
// the Pasaley API, so this is unaffected by captchas or Daraz being down.
// Run with `npm run test:replica`.
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { BROWSERS, checks, countryOf, interceptorRunning, itemIds, launch, loadRecordings, open, sleep, waitFor } from './helpers.mjs'

const recordings = loadRecordings()

for (const name of ['chrome', 'firefox']) {
  describe(name, { skip: !BROWSERS.includes(name) }, () => {
    let browser
    before(async () => { browser = await launch(name) })
    after(() => browser?.close())

    if (recordings.length === 0) test('recordings', (t) => t.skip('no recordings yet: run `npm run record` first'))

    for (const recording of recordings) {
      test(`${recording.kind}: ${recording.url} (recorded ${recording.recordedAt.slice(0, 10)})`, async () => {
        const opened = await open(browser, recording.url, recording)
        try {
          await checks[recording.kind](opened, recording.url)
        } finally {
          await opened.page.close()
        }
      })
    }

    // Daraz's pages load product lists in the background, with fetch or XMLHttpRequest, and
    // the extension reads every response it sees. Today's pages carry at most 40 products per
    // response, so this adds a long list to a recorded homepage and loads it from the page.
    const home = recordings.find((recording) => recording.kind === 'home')
    test('product lists from fetch and XMLHttpRequest responses', { skip: !home && 'no homepage recording' }, async () => {
      const list = productList(120)
      const ids = itemIds(list)
      const viaFetch = `${home.url}?via=fetch`
      const viaXhr = `${home.url}?via=xhr`
      const recording = { ...home, responses: [...home.responses, jsonResponse(viaFetch, list), jsonResponse(viaXhr, list)] }

      const opened = await open(browser, home.url, recording)
      const { page, apiCalls } = opened
      try {
        assert.ok(await interceptorRunning(page), 'page-world script is not running')
        // The same response fetched twice, as a page polyfilling fetch with XMLHttpRequest makes it look.
        await page.evaluate(async (viaFetch, viaXhr) => {
          await fetch(viaFetch)
          await fetch(viaFetch)
          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.onload = resolve
            xhr.onerror = () => reject(new Error(`XMLHttpRequest to ${viaXhr} failed`))
            xhr.open('GET', viaXhr)
            xhr.send()
          })
        }, viaFetch, viaXhr)

        const sentFrom = (url) => apiCalls.filter((c) => c.url.pathname.endsWith('/ingest/products') && c.body?.responseUrl === url)
        const itemsSent = (calls) => calls.flatMap((c) => c.body.items)
        // Wait until every product has been sent for both, then a moment more, so a second
        // report of the fetched response would show up.
        await waitFor(() => [viaFetch, viaXhr].every((url) => itemsSent(sentFrom(url)).length >= ids.size))
        await sleep(2000)

        for (const url of [viaFetch, viaXhr]) {
          const calls = sentFrom(url)
          const sent = itemsSent(calls).map((item) => String(item.itemId))
          assert.deepEqual(calls.map((c) => c.body.items.length).sort((a, b) => a - b), [20, 50, 50],
            `products from ${url} should be sent in requests of at most 50 (sent: [${calls.map((c) => c.body.items.length)}])`)
          assert.deepEqual(new Set(sent), ids, `not every product from ${url} was sent, or something else was`)
          assert.equal(sent.length, ids.size, `a product from ${url} was sent twice`)
          for (const call of calls) {
            assert.equal(call.method, 'POST')
            assert.ok(call.signed, 'products were sent without a valid signature')
            // Daraz's homepage script changes the page URL's fragment while the page is open.
            assert.equal(call.body.href.split('#')[0], page.url().split('#')[0])
            assert.ok(call.body.items.every((item) => item.hostCountry === countryOf(home.url)), 'products were sent without their country')
          }
        }
      } finally {
        await page.close()
      }
    })
  })
}

// A Daraz-like product list: items with an itemId and a price, and other things Daraz puts
// in the same arrays, which aren't products.
function productList(count) {
  const items = Array.from({ length: count }, (_, i) => ({ itemId: String(900000000 + i), price: String(1000 + i), name: `Test product ${i}` }))
  return { mods: { listItems: [...items, null, 'string', 42] } }
}

// A recorded JSON response, as `npm run record` saves them.
const jsonResponse = (url, body) => ({
  method: 'GET', url, type: 'fetch', status: 200,
  headers: { 'content-type': 'application/json' },
  body: Buffer.from(JSON.stringify(body)).toString('base64'),
})
