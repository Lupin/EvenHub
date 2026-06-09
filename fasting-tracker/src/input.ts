import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { toggleDisplayMode, renderCurrentMode } from './display'

export function setupInputHandlers(bridge: EvenAppBridge) {
  // Listen for swipe events to toggle between display modes
  // The Even Hub SDK event API uses container-level callbacks via isEventCapture.
  // This is a placeholder until the exact Even Hub event API is verified.
  // For now, we rely on the periodic refresh in main.ts.
  console.log('[FastingTracker] Input handlers registered')
}
