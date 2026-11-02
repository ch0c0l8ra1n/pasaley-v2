// Renders the extension's chart (ChartApp, unchanged) the way the extension does: in a
// shadow root inside #module_product_price_1, with the price history API answered by the
// playground (mock data, or a real product's history fetched from pasaley.com).
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import ChartApp from '@/content-scripts/chart/ChartApp'
import { setShadoDomStyles, setupShadowDOM } from '@/content-scripts/chart/shadowdom'
import '@/content-scripts/chart/index.css'
import type { PriceHistory } from '@/lib/api'

type Options = { productId: string; hostCountry: string; history: PriceHistory; delay: number }

let options: Options
let root: Root | undefined

// The chart asks the API for the price history. Answer with the playground's instead.
export const realFetch = window.fetch
window.fetch = async (input, init) => {
  if (!String(input).includes('/pricehistory')) return realFetch(input, init)
  await new Promise((resolve) => setTimeout(resolve, options.delay))
  return new Response(JSON.stringify({ data: options.history }), { headers: { 'Content-Type': 'application/json' } })
}

// In dev, Vite adds each CSS file as a <style> in <head>. The extension's styles belong in
// the chart's shadow root, as in the built extension, so copy them there and switch off the
// originals. Kept in sync as you edit them.
function moveExtensionStyles() {
  const sync = () => {
    const styles = [...document.querySelectorAll<HTMLStyleElement>('style[data-vite-dev-id*="/src/"]')]
    styles.forEach((style) => (style.media = 'not all'))
    setShadoDomStyles(styles.map((style) => style.textContent).join('\n'))
  }
  sync()
  new MutationObserver(sync).observe(document.head, { childList: true, subtree: true, characterData: true })
}

// Adds the chart, or redraws it with new options (ChartApp only fetches when it mounts).
export function renderChart(next: Options) {
  options = next
  if (!root) {
    setupShadowDOM()
    moveExtensionStyles()
    const shadowRoot = document.getElementById('pasaley-host')!.shadowRoot!
    root = createRoot(shadowRoot.getElementById('pasaley-root')!)
  }
  root.render(
    <StrictMode>
      <div className="py-2">
        <ChartApp key={JSON.stringify(next)} productId={next.productId} hostCountry={next.hostCountry} />
      </div>
    </StrictMode>
  )
}
