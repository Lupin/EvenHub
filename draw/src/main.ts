import {
  waitForEvenAppBridge, CreateStartUpPageContainer,
  TextContainerProperty, TextContainerUpgrade, OsEventTypeList,
} from '@evenrealities/even_hub_sdk'

async function main() {
  const bridge = await waitForEvenAppBridge()
  const FW = '\u3000'

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

  // Onboard: random glyph pattern so the glasses show something at startup
  function onboardPattern(): string {
    const all = ['■','□','▣','▤','▥','▦','▧','▨','▩','▲','△','▶','▷','▼','▽','◀','◁','◆','◇','◈','◊','○','◌','◎','●','◐','◑','◢','◣','◤','◥','◯']
    const rows: string[] = []
    for (let y = 0; y < 7; y++) {
      let line = ''
      for (let x = 0; x < 18; x++) line += all[Math.floor(Math.random() * all.length)]
      rows.push(line)
    }
    return rows.join('\n') + '\n\n  draw — start on your phone'
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
    if ((e.eventType ?? 0) === OsEventTypeList.DOUBLE_CLICK_EVENT) bridge.shutDownPageContainer(1)
  })

  setInterval(() => {
    const raw = localStorage.getItem('g2-push')
    if (!raw) return
    localStorage.removeItem('g2-push')
    try {
      const cmd = JSON.parse(raw)
      let content = ''
      if (cmd.mode === 'text') {
        const pool: string[] = cmd.glyphs || ['■']
        content = renderText(cmd.text || '8', pool, cmd.random)
      } else if (cmd.mode === 'draw') {
        content = renderDraw(cmd.lines)
      }
      if (content) {
        bridge.textContainerUpgrade(new TextContainerUpgrade({
          containerID: 1, containerName: 'main', content,
        }))
      }
    } catch(e) {}
  }, 300)
}
main()
