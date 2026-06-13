import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { OsEventTypeList } from '@evenrealities/even_hub_sdk'

export function setupInputHandlers(bridge: EvenAppBridge): () => void {
  const unsubscribe = bridge.onEvenHubEvent((event) => {
    const evt = event.listEvent || event.textEvent || event.sysEvent
    if (!evt?.eventType) return

    const type: OsEventTypeList | undefined =
      typeof evt.eventType === 'number'
        ? evt.eventType
        : OsEventTypeList.fromJson(evt.eventType)

    // Double-click → exit app (system confirmation dialog)
    // Mode switching is handled from the companion app only
    if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      bridge.shutDownPageContainer(1)
    }
  })

  return unsubscribe
}
