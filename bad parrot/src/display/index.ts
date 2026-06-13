import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'
import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  ListContainerProperty,
  ListItemContainerProperty,
  TextContainerProperty,
  ImageContainerProperty,
  ImageRawDataUpdate,
} from '@evenrealities/even_hub_sdk'
import { categories } from '../data'
import { ANCHOR_Y, condense } from '../types'
import type { NavigationLevel } from '../types'

let pageCreated = false

/** Level 0: category list (3 slang levels). */
export function renderCategoryList(bridge: EvenAppBridge): void {
  const names = [...categories.map(c => c.name), 'BIG WORDS']

  const list = new ListContainerProperty({
    containerID: 1,
    containerName: 'cats',
    xPosition: 4,
    yPosition: ANCHOR_Y,
    width: 568,
    height: 280,
    isEventCapture: 1,
    itemContainer: new ListItemContainerProperty({
      itemCount: names.length,
      itemWidth: 560,
      isItemSelectBorderEn: 1,
      itemName: names,
    }),
  })

  if (!pageCreated) {
    bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: 1, listObject: [list] })
    )
    pageCreated = true
  } else {
    bridge.rebuildPageContainer(
      new RebuildPageContainer({ containerTotalNum: 1, listObject: [list] })
    )
  }
}

/** Level 1: phrase list within a category (English only). */
export function renderPhraseList(bridge: EvenAppBridge, catIndex: number): void {
  const cat = categories[catIndex]
  const names = cat.phrases.map(p => p.en)

  const list = new ListContainerProperty({
    containerID: 1,
    containerName: 'phrases',
    xPosition: 4,
    yPosition: ANCHOR_Y,
    width: 568,
    height: 280,
    isEventCapture: 1,
    itemContainer: new ListItemContainerProperty({
      itemCount: names.length,
      itemWidth: 560,
      isItemSelectBorderEn: 1,
      itemName: names,
    }),
  })

  bridge.rebuildPageContainer(
    new RebuildPageContainer({ containerTotalNum: 1, listObject: [list] })
  )
}

/** Level 2: detail view — phrase text + list nav (◀ BIG ▶). */
export function renderDetail(
  bridge: EvenAppBridge,
  catIndex: number,
  phraseIndex: number
): void {
  const cat = categories[catIndex]
  const p = cat.phrases[phraseIndex]
  const total = cat.phrases.length

  const line1 = condense(p.jp, 22)
  const line2 = condense(p.ph, 45)
  const line3 = condense(p.en, 47)
  const header = `${cat.name}  ${phraseIndex + 1}/${total}`
  const content = `${header}\n\n${line1}\n${line2}\n${line3}`

  // Text container — phrase content, no event capture (display only)
  const text = new TextContainerProperty({
    containerID: 1,
    containerName: 'detail',
    content,
    xPosition: 4,
    yPosition: ANCHOR_Y,
    width: 568,
    height: 190,
    isEventCapture: 0,
  })

  // List container — nav items (◀ / BIG / ▶), handles all tap/scroll
  const nav = new ListContainerProperty({
    containerID: 2,
    containerName: 'detailNav',
    xPosition: 100,
    yPosition: 220,
    width: 376,
    height: 64,
    isEventCapture: 1,
    itemContainer: new ListItemContainerProperty({
      itemCount: 3,
      itemWidth: 360,
      isItemSelectBorderEn: 1,
      itemName: ['◀  Previous', 'BIG', '▶  Next'],
    }),
  })

  bridge.rebuildPageContainer(
    new RebuildPageContainer({
      containerTotalNum: 2,
      textObject: [text],
      listObject: [nav],
    })
  )
}

// ── Big Kanji View (Level 3) ──────────────────────────────

const KANJI_IMG_W = 288
const KANJI_IMG_H = 144
const KANJI_IMG_X = (576 - KANJI_IMG_W) / 2  // 144, centered
const KANJI_IMG_Y = 0
const KANJI_TEXT_Y = 150
const KANJI_TEXT_H = 134

async function loadAndPushKanjiImage(
  bridge: EvenAppBridge,
  catIndex: number,
  phraseIndex: number
): Promise<void> {
  const url = `/images/kanji/${catIndex}_${phraseIndex}.png`

  const resp = await fetch(url)
  if (!resp.ok) {
    console.error(`Kanji image not found: ${url}`)
    return
  }
  const blob = await resp.blob()
  const objectUrl = URL.createObjectURL(blob)

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = document.createElement('img')
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Image load failed'))
    el.src = objectUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = KANJI_IMG_W
  canvas.height = KANJI_IMG_H
  canvas.getContext('2d')!.drawImage(img, 0, 0, KANJI_IMG_W, KANJI_IMG_H)
  URL.revokeObjectURL(objectUrl)

  const outBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
  )
  const bytes = new Uint8Array(await outBlob.arrayBuffer())

  const result = await bridge.updateImageRawData(
    new ImageRawDataUpdate({
      containerID: 2,
      containerName: 'kanjiImg',
      imageData: bytes,
    })
  )
  if (result !== 'success') {
    console.error('updateImageRawData:', result)
  }
}

export function renderBigKanji(
  bridge: EvenAppBridge,
  catIndex: number,
  phraseIndex: number,
  kanjiIndex?: number,
  totalAll?: number
): void {
  const cat = categories[catIndex]
  const p = cat.phrases[phraseIndex]
  const total = cat.phrases.length

  const header = `${cat.name}  ${phraseIndex + 1}/${total}${kanjiIndex !== undefined ? '  ·  all' : ''}`
  const nav = `↑↓ all phrases`
  const content = `${header}\n\n${p.ph}\n${p.en}\n\n${nav}`

  const image = new ImageContainerProperty({
    containerID: 2,
    containerName: 'kanjiImg',
    xPosition: KANJI_IMG_X,
    yPosition: KANJI_IMG_Y,
    width: KANJI_IMG_W,
    height: KANJI_IMG_H,
  })

  const text = new TextContainerProperty({
    containerID: 1,
    containerName: 'kanjiText',
    content,
    xPosition: 4,
    yPosition: KANJI_TEXT_Y,
    width: 568,
    height: KANJI_TEXT_H,
    isEventCapture: 1,
  })

  bridge.rebuildPageContainer(
    new RebuildPageContainer({
      containerTotalNum: 2,
      textObject: [text],
      imageObject: [image],
    })
  )

  // Push image bytes (async — don't block the render)
  loadAndPushKanjiImage(bridge, catIndex, phraseIndex).catch(err =>
    console.error('loadAndPushKanjiImage failed:', err)
  )
}
