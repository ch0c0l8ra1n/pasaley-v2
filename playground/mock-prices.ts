// Mock price histories, in the shape the API returns them.

type Price = { time: string; price: number }

const DAY = 24 * 60 * 60 * 1000

// A small seeded random generator, so the mock data is the same on every reload.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// About eight months of a price around `current`: small day-to-day moves, a higher price
// over the summer, and drops during sale days (9.9, 10.10). Ends today at `current`.
function realistic(current: number): Price[] {
  const rand = random(482626139)
  const now = Date.now()
  const prices: Price[] = []
  let price = Math.round(current * 1.15)
  for (let time = now - 240 * DAY; time < now - DAY; time += (1 + Math.floor(rand() * 4)) * DAY) {
    const date = new Date(time)
    const sale = (date.getMonth() === 8 && date.getDate() >= 8 && date.getDate() <= 11) ||
      (date.getMonth() === 9 && date.getDate() >= 9 && date.getDate() <= 12)
    const summer = date.getMonth() >= 4 && date.getMonth() <= 7
    if (rand() < 0.35) price = Math.round(current * (summer ? 1.25 : 1.05) * (0.94 + rand() * 0.12))
    prices.push({ time: date.toISOString(), price: sale ? Math.round(current * 0.85) : price })
  }
  prices.push({ time: new Date(now).toISOString(), price: current })
  return prices
}

// A product listed a few days ago.
const newListing = (current: number): Price[] =>
  [5, 3, 1, 0].map((days, i) => ({ time: new Date(Date.now() - days * DAY).toISOString(), price: i < 2 ? Math.round(current * 1.1) : current }))

// The same price for months.
const stable = (current: number): Price[] =>
  [180, 120, 60, 0].map((days) => ({ time: new Date(Date.now() - days * DAY).toISOString(), price: current }))

export const scenarios: Record<string, (current: number) => Price[]> = {
  'Eight months': realistic,
  'New listing': newListing,
  'Stable price': stable,
  'No history': () => [],
}
