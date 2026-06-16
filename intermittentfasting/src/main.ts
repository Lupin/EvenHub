import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { renderCurrentMode, rebuildCurrentMode, rebuildTextModeFull, loadAndPushImage, setStorageReady } from './display'
import { setupInputHandlers } from './input'
import { loadConfig, setBridge } from './storage'
import { getPreset, isFastingDay, getCurrentFastingState } from './config'

async function main() {
  try {
    const bridge = await waitForEvenAppBridge()
    console.log('[FastingTracker] Bridge connected')

    // Expose bridge globally so companion app (inline script) can use
    // setLocalStorage/getLocalStorage for persistent settings
    ;(window as any).__bridge = bridge
    setStorageReady(true)

    // Expose force-refresh so companion can trigger immediate glasses update
    ;(window as any).__forceRefresh = async () => {
      const cfg = await loadConfig()
      if (cfg.displayMode === 'text') {
        await rebuildTextModeFull(bridge)
      } else {
        await rebuildCurrentMode(bridge)
      }
    }

    // Share bridge with storage layer (persistent bridge storage)
    setBridge(bridge)

    // ── First render ──
    const config = await loadConfig()
    const preset = getPreset(config.presetId)
    if (preset && !isFastingDay(preset)) {
      console.log('[FastingTracker] Rest day — no fasting today')
    }
    const created = await renderCurrentMode(bridge)
    if (created !== 0) {
      console.error('[FastingTracker] createStartUpPageContainer failed:', created)
    }

    // ── Push correct EAT/FAST image to G2 ──
    const state = getCurrentFastingState(config.schedule)
    const imageUrl = state.isFasting ? '/FAST.png' : '/EAT.png'
    await loadAndPushImage(bridge, imageUrl)

    // ── Double-click to toggle modes ──
    setupInputHandlers(bridge)

    // ── Config change detection: poll for changes ──
    // Use bridge storage as source of truth (survives repacks).
    // Companion app writes config → bridge setLocalStorage → we poll it.
    let lastConfigRaw = ''
    let lastDisplayMode = config.displayMode

    // Initial read of bridge storage for the raw string
    try {
      lastConfigRaw = await bridge.getLocalStorage('even-fasting-config') || ''
    } catch {}

    // Polling every 2s — detects config changes from companion app
    setInterval(async () => {
      try {
        const current = await bridge.getLocalStorage('even-fasting-config')
        if (current && current !== lastConfigRaw) {
          console.log('[FastingTracker] Config changed (poll detected), rebuilding')
          lastConfigRaw = current
          const newConfig = await loadConfig()
          if (newConfig.displayMode !== lastDisplayMode) {
            lastDisplayMode = newConfig.displayMode
            if (newConfig.displayMode === 'text') {
              await rebuildTextModeFull(bridge)
            } else {
              await rebuildCurrentMode(bridge)
            }
          } else {
            await rebuildCurrentMode(bridge)
          }
        }
      } catch (e) {
        // bridge may not be ready on first tick — ignore
      }
    }, 2000)

    // ── Periodic refresh every 30s (clock, progress bar) ──
    setInterval(async () => {
      await rebuildCurrentMode(bridge)
    }, 30000)

    // ── Fast refresh for blinking indicator — text mode only ──
    setInterval(async () => {
      const config = await loadConfig()
      if (config.displayMode === 'text') {
        await rebuildCurrentMode(bridge)
      }
    }, 800)
  } catch (err) {
    console.error('[FastingTracker] Failed to init:', err)
  }
}

main()
