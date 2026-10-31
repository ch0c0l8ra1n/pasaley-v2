// Serves the Daraz pages recorded by `npm run record` (in tests/recordings/) to Chrome and
// Firefox with the extension loaded, and checks that it works. Nothing goes to Daraz or
// the Pasaley API, so this is unaffected by captchas or Daraz being down.
// Run with `npm run test:replica`.
import { after, before, describe, test } from 'node:test'
import { BROWSERS, checks, launch, loadRecordings, open } from './helpers.mjs'

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
  })
}
