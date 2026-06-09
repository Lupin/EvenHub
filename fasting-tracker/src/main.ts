import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import { renderCurrentMode } from './display'
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

    // Initial render
    await renderCurrentMode(bridge)

    // Periodic refresh every 30 seconds
    setInterval(async () => {
      await renderCurrentMode(bridge)
    }, 30000)
  } catch (err) {
    console.error('[FastingTracker] Failed to init:', err)
  }
}

main()
