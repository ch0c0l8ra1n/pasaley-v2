import { realFetch, renderChart } from './mount'
import { scenarios } from './mock-prices'
import { publishSkus, selectedSkuFromUrl } from '@/lib/skus'
import type { PriceHistory } from '@/lib/api'

const LIVE = 'Live product'
const form = document.querySelector<HTMLFormElement>('#controls')!
const chart = document.querySelector<HTMLElement>('#module_product_price_1')!
const variant = form.querySelector<HTMLSelectElement>('select[name=variant]')!
const status = document.querySelector<HTMLElement>('#status')!

for (const [i, name] of [LIVE, ...Object.keys(scenarios)].entries()) {
  form.querySelector('#scenario')!.insertAdjacentHTML('beforeend',
    `<label><input type="radio" name="scenario" value="${name}" ${i === 0 ? 'checked' : ''} /> ${name}</label>`)
}

// A real product's history, as the released extension gets it (v3, without the last 10 minutes).
async function liveHistory(link: string) {
  const url = new URL(link)
  const productId = url.pathname.match(/-i(\d+)/)?.[1]
  if (!productId) throw new Error('Not a Daraz product link')
  const hostCountry = url.hostname.split('.').pop()!
  const api = new URL('https://www.pasaley.com/api/v3/pricehistory')
  api.search = new URLSearchParams({ id: productId, hostCountry }).toString()
  const history: PriceHistory = (await (await realFetch(api)).json()).data
  return { productId, hostCountry, history, selected: selectedSkuFromUrl(url.pathname) }
}

// On Daraz the page script publishes the page's variants for the chart. Here they come from the
// API: the named ones, since a variant gets its name from the product page it's on.
const named = (history: PriceHistory) =>
  history.skus.flatMap((sku) => (sku.name ? [{ skuId: sku.skuId, name: sku.name }] : []))

function showVariants(history: PriceHistory, selected?: string) {
  const skus = named(history)
  variant.innerHTML = skus.map((sku) => `<option value="${sku.skuId}">${sku.name}</option>`).join('')
  variant.value = selected ?? skus[0]?.skuId ?? ''
  variant.disabled = skus.length === 0
  publishSkus({ selected: variant.value || undefined, skus })
}

let history: PriceHistory = { prices: [], skus: [] }

async function update() {
  const data = new FormData(form)
  chart.style.width = `${data.get('width')}px`
  const delay = data.get('slow') ? 4000 : 300
  const scenario = String(data.get('scenario'))
  if (scenario !== LIVE) {
    history = { prices: scenarios[scenario](545), skus: [] }
    status.textContent = 'Mock price history for Thermocot Men\'s Cotton Thermal Set (Rs. 545).'
    showVariants(history)
    return renderChart({ productId: '482626139', hostCountry: 'np', history, delay })
  }
  status.textContent = 'Loading from pasaley.com…'
  try {
    const live = await liveHistory(String(data.get('link')))
    history = live.history
    status.textContent = `${history.prices.length} prices, ${history.skus.length} variants, from pasaley.com.`
    showVariants(history, live.selected)
    renderChart({ productId: live.productId, hostCountry: live.hostCountry, history, delay })
  } catch (err) {
    status.textContent = String(err)
  }
}
form.addEventListener('change', (event) => {
  // Picking a variant is what the page does when you click one: the chart follows, no reload.
  if (event.target === variant) publishSkus({ selected: variant.value, skus: named(history) })
  else update()
})
update()

// Links to the pages saved with `npm run playground:save`.
const saved = Object.keys(import.meta.glob('./saved/*.html'))
const nav = document.querySelector('#saved')!
if (saved.length === 0) nav.insertAdjacentHTML('beforeend', '<p>None yet: run <code>npm run playground:save</code>.</p>')
for (const file of saved) nav.insertAdjacentHTML('beforeend', `<a href="${file.slice(1)}">${file.slice(8)}</a>`)
