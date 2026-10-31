import { renderChart } from './mount'
import { scenarios } from './mock-prices'

const form = document.querySelector<HTMLFormElement>('#controls')!
const chart = document.querySelector<HTMLElement>('#module_product_price_1')!

for (const [i, name] of Object.keys(scenarios).entries()) {
  form.querySelector('#scenario')!.insertAdjacentHTML('beforeend',
    `<label><input type="radio" name="scenario" value="${name}" ${i === 0 ? 'checked' : ''} /> ${name}</label>`)
}

function update() {
  const data = new FormData(form)
  chart.style.width = `${data.get('width')}px`
  renderChart({
    productId: '482626139',
    hostCountry: 'np',
    currentPrice: 545,
    scenario: String(data.get('scenario')),
    delay: data.get('slow') ? 4000 : 300,
  })
}
form.addEventListener('change', update)
update()

// Links to the pages saved with `npm run playground:save`.
const saved = Object.keys(import.meta.glob('./saved/*.html'))
const nav = document.querySelector('#saved')!
if (saved.length === 0) nav.insertAdjacentHTML('beforeend', '<p>None yet: run <code>npm run playground:save</code>.</p>')
for (const file of saved) nav.insertAdjacentHTML('beforeend', `<a href="${file.slice(1)}">${file.slice(8)}</a>`)
