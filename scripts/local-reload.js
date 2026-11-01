// Only in the local build (scripts/local-extension.mjs). Chrome reads an
// unpacked extension's files from disk, so a new build shows up as a new
// build-id.txt: reload the extension, then any open Daraz tabs.
const DARAZ = ['https://www.daraz.com.np/*', 'https://www.daraz.pk/*', 'https://www.daraz.com.bd/*', 'https://www.daraz.lk/*']

const check = async () => {
  const resp = await fetch(chrome.runtime.getURL('build-id.txt'), { cache: 'no-store' })
  const id = await resp.text()
  const { buildId, refreshTabs } = await chrome.storage.local.get(['buildId', 'refreshTabs'])

  if (refreshTabs) {
    await chrome.storage.local.remove('refreshTabs')
    for (const tab of await chrome.tabs.query({ url: DARAZ })) chrome.tabs.reload(tab.id)
  }
  if (id === buildId) return

  await chrome.storage.local.set({ buildId: id, refreshTabs: Boolean(buildId) })
  if (buildId) chrome.runtime.reload()
}

chrome.alarms.onAlarm.addListener(check)
chrome.alarms.create('check-build', { periodInMinutes: 5 / 60 })
check()
