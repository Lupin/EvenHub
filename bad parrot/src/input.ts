import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import { OsEventTypeList } from '@evenrealities/even_hub_sdk'
import type { NavigationLevel } from './types'

export function setupInputHandlers(
  bridge: EvenAppBridge,
  getLevel: () => NavigationLevel,
  onSelectCategory: (index: number) => void,
  onSelectPhrase: (index: number) => void,
  onNext: () => void,
  onPrev: () => void,
  onBack: () => void
): () => void {
  return bridge.onEvenHubEvent((event) => {
    const lev = getLevel()
    const evt = event.listEvent || event.textEvent || event.sysEvent
    if (!evt) return

    let type: OsEventTypeList | undefined

    if (evt.eventType !== undefined) {
      type = typeof evt.eventType === 'number'
        ? evt.eventType
        : OsEventTypeList.fromJson(evt.eventType)
    } else if (event.listEvent) {
      type = OsEventTypeList.CLICK_EVENT
    }

    // Double-tap: exit at level 0, back at other levels
    if (type === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      if (lev === 0) {
        bridge.shutDownPageContainer(1)
      } else {
        onBack()
      }
      return
    }

    // List click (levels 0 and 1)
    if (event.listEvent && lev <= 1) {
      let idx = event.listEvent.currentSelectItemIndex
      if (idx === undefined || idx === null) idx = 0
      if (lev === 0) onSelectCategory(idx)
      else onSelectPhrase(idx)
      return
    }

    // Level 2: swipe ↑↓ for prev/next (image + text view)
    if (lev === 2) {
      if (type === OsEventTypeList.SCROLL_TOP_EVENT) onPrev()
      else if (type === OsEventTypeList.SCROLL_BOTTOM_EVENT) onNext()
      return
    }
  })
}
