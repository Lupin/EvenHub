/**
 * display/index.ts — G2 rendering
 *
 * TextContainer only. Cursor ">" moves item-by-item with swipe.
 * Tap opens detail of the currently selected item.
 */

import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
} from '@evenrealities/even_hub_sdk'
import type { HermesMessage } from '../types'
import { T } from '../types'

const W = 576
const H = 260
const PAD = 4

let pageCreated = false
let cachedMessages: HermesMessage[] = []

function s16(n: string) { return n.substring(0, 16) }
function noNL(s: string) { return s.replace(/\n+$/, '') }

function tag(s: string): string {
  return { cron: 'cron', session: 'sess', direct: 'dir' }[s] || s
}

let rendering: Promise<unknown> = Promise.resolve()

export async function renderLoading(bridge: EvenAppBridge): Promise<void> {
  const t = new TextContainerProperty({
    xPosition: 0, yPosition: 120, width: W, height: 48,
    containerID: 1, containerName: s16('loading'),
    content: T.en.loading,
    isEventCapture: 0, borderWidth: 0, paddingLength: PAD,
  })
  if (!pageCreated) { pageCreated = true; await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({ containerTotalNum: 1, textObject: [t] })) }
  else { await bridge.rebuildPageContainer(new RebuildPageContainer({ containerTotalNum: 1, textObject: [t] })) }
}

// ── List with movable cursor ─────────────────────────────────

export async function renderMessageList(
  bridge: EvenAppBridge,
  messages: HermesMessage[],
  configLabel: string,
  _lastSeenTs: number,
  cursorIdx: number = 0,
): Promise<void> {
  cachedMessages = messages
  if (messages.length === 0) {
    const content = noNL(`Hermes · ${configLabel} (0)\n\n${T.en.noMessagesFilter}\n${T.en.noMessagesFilterSub}`)
    const body = new TextContainerProperty({
      xPosition: 0, yPosition: 60, width: W, height: 168,
      borderWidth: 0, paddingLength: PAD,
      containerID: 1, containerName: s16('empty'),
      content, isEventCapture: 1,
    })
    if (!pageCreated) { pageCreated = true; await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({ containerTotalNum: 1, textObject: [body] })) }
    else { await bridge.rebuildPageContainer(new RebuildPageContainer({ containerTotalNum: 1, textObject: [body] })) }
    return
  }

  const cursor = Math.max(0, Math.min(cursorIdx, messages.length - 1))
  const lines: string[] = [`Hermes · ${configLabel}  ${cursor+1}/${messages.length}`, '']

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    const cur = (i === cursor) ? '>' : ' '
    lines.push(`${cur} [${tag(m.source)}] ${m.label}`)
  }
  lines.push('')
  lines.push('\u2195:cursor  tap:open  \u29C9:exit')

  const content = noNL(lines.join('\n'))
  const body = new TextContainerProperty({
    xPosition: 0, yPosition: 0, width: W, height: H,
    borderWidth: 0, paddingLength: PAD,
    containerID: 1, containerName: s16('list'),
    content, isEventCapture: 1,
  })

  if (!pageCreated) {
    pageCreated = true
    await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({ containerTotalNum: 1, textObject: [body] }))
  } else {
    rendering = rendering.then(async () => {
      await bridge.textContainerUpgrade(new TextContainerUpgrade({ containerID: 1, containerName: s16('list'), content }))
    })
    await rendering
  }
}

// ── Detail view ──────────────────────────────────────────────

export async function renderMessageDetail(
  bridge: EvenAppBridge,
  index: number,
): Promise<void> {
  const msg = cachedMessages[index]
  if (!msg) return

  const dateStr = new Date(msg.ts).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
  const srcStr = { cron: 'Cron', session: 'Session', direct: 'Direct' }[msg.source]
  const bodyText = msg.body.length > 1900 ? msg.body.substring(0, 1897) + '…' : msg.body
  const content = noNL(`${msg.label}\n${srcStr} · ${dateStr}\n\n${bodyText}`)

  const body = new TextContainerProperty({
    xPosition: 0, yPosition: 0, width: W, height: H,
    borderWidth: 0, paddingLength: PAD,
    containerID: 1, containerName: s16('detail'),
    content, isEventCapture: 1,
  })

  await bridge.rebuildPageContainer(new RebuildPageContainer({ containerTotalNum: 1, textObject: [body] }))
}

export function resetPageState(): void {
  pageCreated = false
  cachedMessages = []
}
