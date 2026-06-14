// ── G2 input handlers ────────────────────────────────────────
// TextContainer only (no ListContainer — SDK crashes with it).
// Tap on text → detail (list mode) or next (detail mode).
// Swipe → prev/next. Double-tap → back/exit.

import type { EvenAppBridge, EvenHubEvent } from '@evenrealities/even_hub_sdk'
import { OsEventTypeList } from '@evenrealities/even_hub_sdk'

export function setupInputHandlers(
  bridge: EvenAppBridge,
  getMode: () => 'list' | 'detail',
  onListTap: () => void,
  onPrev: () => void,
  onNext: () => void,
  onBack: () => void,
  onExit: () => void,
): () => void {
  return bridge.onEvenHubEvent((event: EvenHubEvent) => {
    const sysType = event.sysEvent?.eventType ?? null
    const textType = event.textEvent?.eventType ?? null
    const mode = getMode()

    // Double-tap
    if (sysType === OsEventTypeList.DOUBLE_CLICK_EVENT || (textType as any) === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      if (mode === 'detail') onBack()
      else onExit()
      return
    }

    // Swipe up → prev
    if (textType === OsEventTypeList.SCROLL_TOP_EVENT) { onPrev(); return }

    // Swipe down → next
    if (textType === OsEventTypeList.SCROLL_BOTTOM_EVENT) { onNext(); return }

    // Tap (CLICK_EVENT = 0, may be undefined per protobuf)
    if ((sysType ?? 0) === OsEventTypeList.CLICK_EVENT || (textType ?? 0) === OsEventTypeList.CLICK_EVENT) {
      if (mode === 'list') onListTap()
      else onNext()
      return
    }
  })
}
