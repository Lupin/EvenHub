import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { renderCurrentMode, rebuildCurrentMode, rebuildTextModeFull, loadAndPushImage } from './display'
import { setupInputHandlers } from './input'
import { loadConfig } from './storage'
import { getPreset, isFastingDay } from './config'

const STORAGE_KEY = 'even-fasting-config'

async function main() {
  try {
    const bridge = await waitForEvenAppBridge()
    console.log('[FastingTracker] Bridge connected')

    // ── First render ──
    const config = loadConfig()
    const preset = getPreset(config.presetId)
    if (preset && !isFastingDay(preset)) {
      console.log('[FastingTracker] Rest day — no fasting today')
    }
    const created = await renderCurrentMode(bridge)
    if (created !== 0) {
      console.error('[FastingTracker] createStartUpPageContainer failed:', created)
    }

    // ── Push background image to G2 (centered, mode texte) ──
    await loadAndPushImage(bridge)

    // ── Double-click to toggle modes ──
    setupInputHandlers(bridge)

    // ── Config change detection: storage event + polling ──
    // 'storage' event fires when companion app (different WebView context)
    // writes to localStorage. But on some SDK versions it may not fire,
    // so we also poll every 2s as fallback.
    let lastConfigRaw = localStorage.getItem(STORAGE_KEY)
    let lastDisplayMode = loadConfig().displayMode

    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue && e.newValue !== lastConfigRaw) {
        console.log('[FastingTracker] Config changed (storage event), rebuilding')
        lastConfigRaw = e.newValue
        const newConfig = loadConfig()
        if (newConfig.displayMode !== lastDisplayMode) {
          lastDisplayMode = newConfig.displayMode
          if (newConfig.displayMode === 'text') {
            rebuildTextModeFull(bridge)
          } else {
            rebuildCurrentMode(bridge)
          }
        } else {
          rebuildCurrentMode(bridge)
        }
      }
    })

    // Polling fallback every 2s — catches config changes even if
    // storage event doesn't fire (same-origin iframe, etc.)
    setInterval(() => {
      const current = localStorage.getItem(STORAGE_KEY)
      if (current && current !== lastConfigRaw) {
        console.log('[FastingTracker] Config changed (poll detected), rebuilding')
        lastConfigRaw = current
        const newConfig = loadConfig()
        if (newConfig.displayMode !== lastDisplayMode) {
          lastDisplayMode = newConfig.displayMode
          if (newConfig.displayMode === 'text') {
            rebuildTextModeFull(bridge)
          } else {
            rebuildCurrentMode(bridge)
          }
        } else {
          rebuildCurrentMode(bridge)
        }
      }
    }, 2000)

    // ── Periodic refresh every 30s (clock, progress bar) ──
    setInterval(async () => {
      await rebuildCurrentMode(bridge)
    }, 30000)

    // ── Fast refresh for blinking indicator — text mode only ──
    setInterval(async () => {
      const config = loadConfig()
      if (config.displayMode === 'text') {
        await rebuildCurrentMode(bridge)
      }
    }, 800)
  } catch (err) {
    console.error('[FastingTracker] Failed to init:', err)
  }
}

main()
