// Added to pages saved with `npm run playground:save`: puts the chart in the page.
import { renderChart } from './mount'

const script = document.querySelector<HTMLScriptElement>('script[data-product]')!
const priceText = document.querySelector('#module_product_price_1 .pdp-price')?.textContent ?? ''

renderChart({
  productId: script.dataset.product!,
  hostCountry: script.dataset.country!,
  currentPrice: parseInt(priceText.replace(/[^\d]/g, '')) || 1000,
  scenario: new URLSearchParams(location.search).get('scenario') ?? 'Eight months',
  delay: 600,
})
