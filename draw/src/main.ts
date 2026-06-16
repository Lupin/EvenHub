import {
  waitForEvenAppBridge, CreateStartUpPageContainer,
  TextContainerProperty, TextContainerUpgrade, OsEventTypeList,
} from '@evenrealities/even_hub_sdk'

interface Drawing {
  id: number; name: string; cols: number; rows: number; lines: string[]; date: string;
}

async function main() {
  const bridge = await waitForEvenAppBridge()
  const FW = '\u3000'
  const STORAGE_KEY = 'g2-drawings'

  // ── Persistent storage: bridge ↔ localStorage sync ──
  // On startup: restore drawings from bridge storage into localStorage
  // On save: watch localStorage changes and mirror to bridge
  try {
    const saved = await bridge.getLocalStorage(STORAGE_KEY)
    if (saved) {
      localStorage.setItem(STORAGE_KEY, saved)
    }
  } catch(e) { /* bridge storage unavailable, use whatever is in localStorage */ }

  // Mirror localStorage writes to bridge (survives .ehpk repack)
  const origSetItem = localStorage.setItem.bind(localStorage)
  localStorage.setItem = function(key: string, value: string) {
    origSetItem(key, value)
    if (key === STORAGE_KEY) {
      bridge.setLocalStorage(STORAGE_KEY, value).catch(() => {})
    }
  }

  // Table minuscule → majuscule
  const LOWER: Record<string, string> = {}
  for (let i = 0; i < 26; i++) LOWER[String.fromCharCode(97 + i)] = String.fromCharCode(65 + i)

  const glyphs: Record<string, number[][]> = {
    'A':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1]],
    'B':[[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0]],
    'C':[[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,1]],
    'D':[[1,1,1,0,0],[1,0,0,1,0],[1,0,0,0,1],[1,0,0,1,0],[1,1,1,0,0]],
    'E':[[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,1,1,1,1]],
    'F':[[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0]],
    'G':[[0,1,1,1,1],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[0,1,1,1,1]],
    'H':[[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1]],
    'I':[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
    'J':[[0,0,1,1,1],[0,0,0,1,0],[0,0,0,1,0],[1,0,0,1,0],[0,1,1,0,0]],
    'K':[[1,0,0,0,1],[1,0,0,1,0],[1,1,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
    'L':[[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
    'M':[[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
    'N':[[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1]],
    'O':[[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
    'P':[[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0]],
    'Q':[[0,1,1,1,0],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[0,1,1,1,1]],
    'R':[[1,1,1,1,0],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,1,0],[1,0,0,0,1]],
    'S':[[0,1,1,1,1],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],
    'T':[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
    'U':[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
    'V':[[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
    'W':[[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
    'X':[[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1]],
    'Y':[[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
    'Z':[[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
    '0':[[0,1,1,1,0],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[0,1,1,1,0]],
    '1':[[0,0,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
    '2':[[0,1,1,1,0],[1,0,0,0,1],[0,0,1,1,0],[0,1,0,0,0],[1,1,1,1,1]],
    '3':[[1,1,1,1,0],[0,0,0,0,1],[0,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],
    '4':[[0,0,0,1,1],[0,0,1,0,1],[0,1,0,0,1],[1,1,1,1,1],[0,0,0,0,1]],
    '5':[[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[1,1,1,1,0]],
    '6':[[0,1,1,1,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[0,1,1,1,0]],
    '7':[[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,1,0,0]],
    '8':[[0,1,1,1,0],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[0,1,1,1,0]],
    '9':[[0,1,1,1,0],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,1,1,1,0]],
    ' ' :[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
    ':' :[[0,0,0,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,1,0,0],[0,0,0,0,0]],
    '-' :[[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,1],[0,0,0,0,0],[0,0,0,0,0]],
  }

  function normalize(ch: string): string { return LOWER[ch] || ch }
  function rnd(arr: string[]): string { return arr[Math.floor(Math.random() * arr.length)] }

  function renderText(text: string, pool: string[], randomOn: boolean): string {
    const chars = [...text].slice(0, 4).map(normalize)
    const rows = [[], [], [], [], []] as string[][]
    for (const ch of chars) {
      const g = glyphs[ch] || glyphs[' ']
      for (let r = 0; r < 5; r++)
        rows[r].push(g[r].map(c => c ? (randomOn ? rnd(pool) : pool[0]) : FW).join(''))
    }
    return rows.map(r => r.join(FW)).join('\n')
  }

  function renderDraw(lines: string[]): string {
    return lines.join('\n')
  }

  function loadDrawings(): Drawing[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
    catch (e) { return [] }
  }

  // ── Glasses state machine ──
  type G2State = 'idle' | 'content' | 'gallery'
  let g2State: G2State = 'idle'
  let browseIndex = 0
  let lastContent = '' // saved content to restore on double-tap from gallery

  async function setContent(content: string): Promise<void> {
    await bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: 1, containerName: 'main', content,
    }))
  }

  async function showGallery(): Promise<void> {
    const list = loadDrawings()
    if (list.length === 0) {
      await setContent('\n\n  no drawings saved\n  tap phone to create one')
      return
    }
    if (browseIndex >= list.length) browseIndex = 0
    if (browseIndex < 0) browseIndex = list.length - 1
    const d = list[browseIndex]
    const body = d.lines.join('\n')
    const label = d.name
    const pos = (browseIndex + 1) + '/' + list.length
    await setContent(body + '\n\n' + label + '  ' + pos)
  }

  async function enterGallery(): Promise<void> {
    g2State = 'gallery'
    browseIndex = 0
    await showGallery()
  }

  async function restoreContent(): Promise<void> {
    g2State = 'content'
    // Signal the phone to re-push the current draw/text
    localStorage.setItem('g2-restore', '1')
  }

  // Onboard: 28×7 grid — DRAW centred in ▒, everything else filled with random glyphs
  function onboardPattern(): string {
    const all = ['■','□','▣','▤','▥','▦','▧','▨','▩','▲','△','▶','▷','▼','▽','◀','◁','◆','◇','◈','◊','○','◌','◎','●','◐','◑','◢','◣','◤','◥','◯']
    const FW = '\u3000'
    const greyBlock = '▒'
    const COLS = 28, ROWS = 7
    const word = ['D','R','A','W']
    const LETTER_W = 5, SPACER = 1
    const totalW = word.length * LETTER_W + (word.length - 1) * SPACER // 23
    const startCol = Math.floor((COLS - totalW) / 2) // 2
    const topRow = 1

    // Precompute DRAW footprint: which cells are part of the logo
    const logoCells = new Set<string>()
    let col = startCol
    for (const ch of word) {
      const g = glyphs[ch] || glyphs[' ']
      for (let dy = 0; dy < 5; dy++) {
        for (let dx = 0; dx < LETTER_W; dx++) {
          if (g[dy][dx]) logoCells.add((topRow + dy) + ',' + (col + dx))
        }
      }
      col += LETTER_W + SPACER
    }

    // Build the grid: logo cells get ▒, everything else is random
    const grid: string[] = []
    for (let y = 0; y < ROWS; y++) {
      let line = ''
      for (let x = 0; x < COLS; x++) {
        line += logoCells.has(y + ',' + x) ? greyBlock : all[Math.floor(Math.random() * all.length)]
      }
      grid.push(line)
    }

    return grid.join('\n') + '\n\n  DRAW — start a new drawing on your phone'
  }

  const onboard = onboardPattern()

  await bridge.createStartUpPageContainer(new CreateStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [
      new TextContainerProperty({
        containerID: 1, containerName: 'main',
        content: onboard,
        xPosition: 0, yPosition: 0, width: 576, height: 288,
        isEventCapture: 1,
      }),
    ],
  }))

  bridge.onEvenHubEvent(event => {
    const e = event.listEvent || event.textEvent || event.sysEvent
    if (!e) return
    const et = e.eventType !== undefined ? e.eventType : OsEventTypeList.CLICK_EVENT

    // Double-tap: exit or return to content
    if (et === OsEventTypeList.DOUBLE_CLICK_EVENT) {
      if (g2State === 'gallery') {
        restoreContent()
      } else {
        bridge.shutDownPageContainer(1)
      }
      return
    }

    // Tap: if in gallery, next drawing
    if (et === OsEventTypeList.CLICK_EVENT) {
      if (g2State === 'gallery') {
        browseIndex++
        showGallery()
      }
      return
    }

    // Swipe: enter gallery or navigate
    if (et === OsEventTypeList.SCROLL_TOP_EVENT) {
      if (g2State === 'content' || g2State === 'idle') {
        enterGallery()
      } else if (g2State === 'gallery') {
        browseIndex--
        showGallery()
      }
      return
    }
    if (et === OsEventTypeList.SCROLL_BOTTOM_EVENT) {
      if (g2State === 'content' || g2State === 'idle') {
        enterGallery()
      } else if (g2State === 'gallery') {
        browseIndex++
        showGallery()
      }
      return
    }
  })

  // Poll for pushes from the phone
  setInterval(() => {
    const raw = localStorage.getItem('g2-push')
    if (!raw) return
    localStorage.removeItem('g2-push')
    try {
      const cmd = JSON.parse(raw)
      if (cmd.mode === 'gallery') {
        browseIndex = cmd.index ?? 0
        g2State = 'gallery'
        showGallery()
      } else {
        let content = ''
        if (cmd.mode === 'text') {
          const pool: string[] = cmd.glyphs || ['■']
          content = renderText(cmd.text || '8', pool, cmd.random)
        } else if (cmd.mode === 'draw') {
          content = renderDraw(cmd.lines)
        }
        if (content) {
          lastContent = content
          g2State = 'content'
          setContent(content)
        }
      }
    } catch(e) {}
  }, 300)
}
main()
