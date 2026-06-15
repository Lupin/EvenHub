// main.ts — minimal test
;(window as any)._g2log = (window as any)._g2log || function(m: string) {
  var el = document.getElementById('g2log')
  if (el) el.textContent = m
  console.log(m)
}

;(window as any)._g2log('main.ts loaded')

import { fetchStore, filterMessages } from './data'
import { DEFAULT_CONFIG } from './types'

async function test() {
  ;(window as any)._g2log('test: starting fetch...')
  const cfg = { ...DEFAULT_CONFIG, server: { ip: window.location.hostname, port: 8765 } }
  const store = await fetchStore(cfg)
  if (!store) {
    ;(window as any)._g2log('test: fetch FAILED')
    return
  }
  const msgs = filterMessages(store, cfg)
  ;(window as any)._g2log('test: ' + msgs.length + ' messages')
}

test().catch(e => {
  ;(window as any)._g2log('test: ERROR ' + (e?.message || e))
})
