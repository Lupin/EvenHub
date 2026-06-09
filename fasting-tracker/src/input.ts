/**
 * input.ts — Touchpad event handling for Even G2 glasses.
 * Listens for swipe up/down via EvenAppBridge.onEvenHubEvent()
 * to toggle between text mode and timeline mode.
 */
import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { OsEventTypeList } from '@evenrealities/even_hub_sdk'
import { toggleDisplayMode, rebuildCurrentMode } from './display'

export function setupInputHandlers(bridge: EvenAppBridge): () => void {
  const unsubscribe = bridge.onEvenHubEvent((event) => {
    const evt = event.textEvent || event.sysEvent
    if (!evt?.eventType) return

    const type: OsEventTypeList | undefined =
      typeof evt.eventType === 'number'
        ? evt.eventType
        : OsEventTypeList.fromJson(evt.eventType)

    switch (type) {
      case OsEventTypeList.SCROLL_TOP_EVENT:
      case OsEventTypeList.SCROLL_BOTTOM_EVENT:
        toggleDisplayMode()
        rebuildCurrentMode(bridge)
        break
    }
  })

  return unsubscribe
}
