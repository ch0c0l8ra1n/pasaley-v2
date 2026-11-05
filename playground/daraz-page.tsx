// Added to pages saved with `npm run playground:save`: puts the chart in the page.
import { renderChart } from './mount'
import { mockPrices } from './mock-prices'

const script = document.querySelector<HTMLScriptElement>('script[data-product]')!
const priceText = document.querySelector('#module_product_price_1 .pdp-price')?.textContent ?? ''

renderChart({
  productId: script.dataset.product!,
  hostCountry: script.dataset.country!,
  history: {
    prices: mockPrices(new URLSearchParams(location.search).get('scenario'), parseInt(priceText.replace(/[^\d]/g, '')) || 1000),
    skus: [],
  },
  delay: 600,
})
