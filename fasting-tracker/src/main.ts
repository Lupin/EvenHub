import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { renderCurrentMode, rebuildCurrentMode } from './display'
import { setupInputHandlers } from './input'
import { loadConfig } from './storage'
import { getPreset, isFastingDay } from './config'

async function main() {
  try {
    const bridge = await waitForEvenAppBridge()
    console.log('[FastingTracker] Bridge connected')

    // Check if today is a fasting day (for 5:2, ADF)
    const config = loadConfig()
    const preset = getPreset(config.presetId)
    if (preset && !isFastingDay(preset)) {
      console.log('[FastingTracker] Rest day — no fasting today')
    }

    // First render: createStartUpPageContainer
    await renderCurrentMode(bridge)

    // Touchpad event handling (swipe to toggle modes)
    setupInputHandlers(bridge)

    // Expose refresh function for phone UI Save button
    window.__fastingRefresh = async () => {
      await rebuildCurrentMode(bridge)
    }

    // Periodic refresh every 30 seconds for time updates
    setInterval(async () => {
      await rebuildCurrentMode(bridge)
    }, 30000)

    // Fast refresh every 800ms for blinking indicator
    setInterval(async () => {
      await rebuildCurrentMode(bridge)
    }, 800)
  } catch (err) {
    console.error('[FastingTracker] Failed to init:', err)
  }
}

declare global {
  interface Window {
    __fastingRefresh?: () => Promise<void>
  }
}

main()
