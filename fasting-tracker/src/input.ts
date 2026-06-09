/**
 * input.ts — Touchpad event handling for Even G2 glasses.
 * Only DOUBLE_CLICK reliably reaches custom event handlers.
 * CLICK and SCROLL events are consumed by the SDK internally.
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

    if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      toggleDisplayMode()
      rebuildCurrentMode(bridge)
    }
  })

  return unsubscribe
}
