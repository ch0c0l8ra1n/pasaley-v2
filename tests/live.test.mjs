// Opens the live Daraz pages in tests/pages.json in Chrome and Firefox with the extension
// loaded, and checks that it works. Calls to the Pasaley API are answered by the test.
// Run with `npm run test:live`. If Daraz shows a captcha, that page is skipped.
import { after, before, describe, test } from 'node:test'
import { BROWSERS, PAGES, captchaShown, checks, firstProductLink, launch, open } from './helpers.mjs'

// Opens a page and runs its checks. onOpen(page) runs first, even if the checks fail.
async function run(t, browser, url, kind, onOpen) {
  const opened = await open(browser, url)
  try {
    await onOpen?.(opened.page)
    await checks[kind](opened, url)
  } catch (err) {
    // The captcha can pop up after the page has loaded, so look for it when a check fails.
    if (await captchaShown(opened.page).catch(() => false)) return t.skip('Daraz showed a captcha')
    throw err
  } finally {
    await opened.page.close()
  }
}

for (const name of ['chrome', 'firefox']) {
  describe(name, { skip: !BROWSERS.includes(name) }, () => {
    let browser
    before(async () => { browser = await launch(name) })
    after(() => browser?.close())

    for (const [country, pages] of Object.entries(PAGES)) {
      describe(`daraz .${country}`, () => {
        const products = [...pages.products]

        test(`homepage: products in the page are sent`, (t) => run(t, browser, pages.home, 'home'))

        test(`search: products from page 1 and 2 are sent`, (t) => run(t, browser, pages.search, 'search', async (page) => {
          const link = await firstProductLink(page)
          if (link && !products.includes(link)) products.push(link)
        }))

        test(`product pages: price chart is shown`, async (t) => {
          if (products.length === 0) return t.skip('no product page found or listed')
          for (const url of products) await t.test(url, (t) => run(t, browser, url, 'product'))
        })
      })
    }
  })
}
