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

// ── Layout constants ────────────────────────────────────────

const LIST_W = 220
const LIST_H = 280
const RIGHT_X = 232   // 4 + 220 + 8 gap
const RIGHT_W = 288   // max SDK
const IMG_H = 144     // SDK PB max
const THUMB_Y = ANCHOR_Y + (LIST_H - IMG_H) / 2  // centered beside list

/** Level 0: category list (left half) + app logo (right). */
export function renderCategoryList(bridge: EvenAppBridge): void {
  const names = [...categories.map(c => c.name), 'All categories']

  const list = new ListContainerProperty({
    containerID: 1,
    containerName: 'cats',
    xPosition: 4,
    yPosition: ANCHOR_Y,
    width: LIST_W,
    height: LIST_H,
    isEventCapture: 1,
    itemContainer: new ListItemContainerProperty({
      itemCount: names.length,
      itemWidth: LIST_W - 8,
      isItemSelectBorderEn: 1,
      itemName: names,
    }),
  })

  const logo = new ImageContainerProperty({
    containerID: 2,
    containerName: 'appLogo',
    xPosition: RIGHT_X,
    yPosition: THUMB_Y,
    width: RIGHT_W,
    height: IMG_H,
  })

  if (!pageCreated) {
    bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({
        containerTotalNum: 2,
        listObject: [list],
        imageObject: [logo],
      })
    )
    pageCreated = true
  } else {
    bridge.rebuildPageContainer(
      new RebuildPageContainer({
        containerTotalNum: 2,
        listObject: [list],
        imageObject: [logo],
      })
    )
  }

  // Push static logo image
  loadAndPushLogo(bridge).catch(err =>
    console.error('loadAndPushLogo failed:', err)
  )
}

/** Level 1: phrase list within a category (English only, full width). */
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

/** Level 2: detail view — big kanji image on top, text below. */
export function renderDetail(
  bridge: EvenAppBridge,
  catIndex: number,
  phraseIndex: number
): void {
  const cat = categories[catIndex]
  const p = cat.phrases[phraseIndex]
  const total = cat.phrases.length

  const footer = `${cat.name}  ${phraseIndex + 1}/${total}`
  const content = `${p.jp}\n${p.ph}\n${p.en}\n${footer}`

  // Image container — big kanji (288×144, centered top)
  const image = new ImageContainerProperty({
    containerID: 2,
    containerName: 'kanjiImg',
    xPosition: (576 - 288) / 2,
    yPosition: 0,
    width: 288,
    height: 144,
  })

  // Text container — pronunciation + translation + category (below image)
  const text = new TextContainerProperty({
    containerID: 1,
    containerName: 'kanjiText',
    content,
    xPosition: 4,
    yPosition: 150,
    width: 568,
    height: 134,
    isEventCapture: 1,
  })

  bridge.rebuildPageContainer(
    new RebuildPageContainer({
      containerTotalNum: 2,
      textObject: [text],
      imageObject: [image],
    })
  )

  // Push image bytes (async)
  loadAndPushKanjiImage(bridge, catIndex, phraseIndex).catch(err =>
    console.error('loadAndPushKanjiImage failed:', err)
  )
}

// ── Static Logo ─────────────────────────────────────────────

async function loadAndPushLogo(bridge: EvenAppBridge): Promise<void> {
  const url = '/images/category/logo.png'

  const resp = await fetch(url)
  if (!resp.ok) {
    console.error(`Logo not found: ${url}`)
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
  canvas.width = RIGHT_W
  canvas.height = IMG_H
  canvas.getContext('2d')!.drawImage(img, 0, 0, RIGHT_W, IMG_H)
  URL.revokeObjectURL(objectUrl)

  const outBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
  )
  const bytes = new Uint8Array(await outBlob.arrayBuffer())

  const result = await bridge.updateImageRawData(
    new ImageRawDataUpdate({
      containerID: 2,
      containerName: 'appLogo',
      imageData: bytes,
    })
  )
  if (result !== 'success') {
    console.error(`updateImageRawData (${containerName}):`, result)
  }
}

// ── Big Kanji Image ─────────────────────────────────────────

const KANJI_IMG_W = 288
const KANJI_IMG_H = 144

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
