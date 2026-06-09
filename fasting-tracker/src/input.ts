import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { OsEventTypeList } from '@evenrealities/even_hub_sdk'
import { rebuildCurrentMode } from './display'
import { loadConfig, saveConfig } from './storage'

export function setupInputHandlers(bridge: EvenAppBridge): () => void {
  const unsubscribe = bridge.onEvenHubEvent((event) => {
    const evt = event.textEvent || event.sysEvent
    if (!evt?.eventType) return

    const type: OsEventTypeList | undefined =
      typeof evt.eventType === 'number'
        ? evt.eventType
        : OsEventTypeList.fromJson(evt.eventType)

    const config = loadConfig()

    switch (type) {
      case OsEventTypeList.SCROLL_TOP_EVENT:
        if (config.displayMode !== 'text') {
          config.displayMode = 'text'
          saveConfig(config)
          rebuildCurrentMode(bridge)
        }
        break
      case OsEventTypeList.SCROLL_BOTTOM_EVENT:
        if (config.displayMode !== 'timeline') {
          config.displayMode = 'timeline'
          saveConfig(config)
          rebuildCurrentMode(bridge)
        }
        break
    }
  })

  return unsubscribe
}
