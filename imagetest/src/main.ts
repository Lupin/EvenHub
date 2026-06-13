import {
  CreateStartUpPageContainer,
  EvenAppBridge,
  ImageContainerProperty,
  ImageRawDataUpdate,
  ImageRawDataUpdateResult,
  StartUpPageCreateResult,
  TextContainerProperty,
  waitForEvenAppBridge,
} from '@evenrealities/even_hub_sdk'

const IMG_W = 288
const IMG_H = 144

// ── Carousel images (cycle every 5s) ────────────────────────────────
const IMAGES = [
  { name: 'g2',    url: '/g2.png' },
  { name: 'camel', url: '/camel.png' },
  { name: 'paulo', url: '/paulo.png' },
]
const INTERVAL_MS = 5000

function status(msg: string, cls: string = 'info') {
  const el = document.getElementById('status')!
  el.textContent = msg
  el.className = 'status ' + cls
}

function showPreview(img: HTMLImageElement) {
  const preview = document.getElementById('preview') as HTMLCanvasElement
  preview.style.display = 'block'
  const ctx = preview.getContext('2d')!
  ctx.drawImage(img, 0, 0, IMG_W, IMG_H)
}

// ── Image loader + canvas re-encode + push ──────────────────────────
async function loadAndPushImage(
  bridge: EvenAppBridge,
  image: { name: string; url: string },
): Promise<void> {
  const resp = await fetch(image.url)
  if (!resp.ok) throw new Error(`Fetch ${image.url} → ${resp.status}`)
  const blob = await resp.blob()

  const objectUrl = URL.createObjectURL(blob)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = document.createElement('img')
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error(`Image load failed: ${image.name}`))
    el.src = objectUrl
  })
  URL.revokeObjectURL(objectUrl)

  // Canvas re-encode (MANDATORY for SDK compatibility)
  const canvas = document.createElement('canvas')
  canvas.width = IMG_W
  canvas.height = IMG_H
  canvas.getContext('2d')!.drawImage(img, 0, 0, IMG_W, IMG_H)

  const outBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png'),
  )
  const bytes = new Uint8Array(await outBlob.arrayBuffer())

  const result = await bridge.updateImageRawData(
    new ImageRawDataUpdate({
      containerID: 2,
      containerName: 'frame',
      imageData: bytes,
    }),
  )

  if (result === ImageRawDataUpdateResult.success) {
    status(`${image.name} ✓ (${bytes.length} bytes)`, 'ok')
    showPreview(img)
  } else {
    status(`${image.name} FAILED: ${result}`, 'err')
    console.error(`updateImageRawData ${image.name}:`, result)
  }
}

// ── Main ────────────────────────────────────────────────────────────
async function main() {
  status('Initializing bridge...')

  let bridge: EvenAppBridge
  try {
    bridge = await waitForEvenAppBridge()
  } catch (e: any) {
    status(`Bridge failed: ${e.message}`, 'err')
    return
  }

  // Step 1: Create page with event layer + image container
  const eventLayer = new TextContainerProperty({
    xPosition: 0,
    yPosition: 0,
    width: 576,
    height: 288,
    containerID: 1,
    containerName: 'eventLayer',
    content: ' ',
    isEventCapture: 1,
  })

  const imageContainer = new ImageContainerProperty({
    xPosition: (576 - IMG_W) / 2,
    yPosition: (288 - IMG_H) / 2,
    width: IMG_W,
    height: IMG_H,
    containerID: 2,
    containerName: 'frame',
  })

  status('Creating page...')

  const created = await bridge.createStartUpPageContainer(
    new CreateStartUpPageContainer({
      containerTotalNum: 2,
      textObject: [eventLayer],
      imageObject: [imageContainer],
    }),
  )

  if (created > 1) {
    status(`Create FAILED: ${StartUpPageCreateResult[created] || created}`, 'err')
    return
  }

  const createdLabel = StartUpPageCreateResult[created] || String(created)
  status(`Create: ${createdLabel} | Starting carousel...`)

  // Step 2: Push first image immediately, then cycle every 5s
  let idx = 0

  const tick = async () => {
    try {
      await loadAndPushImage(bridge, IMAGES[idx])
      idx = (idx + 1) % IMAGES.length
    } catch (e: any) {
      status(`Error: ${e.message}`, 'err')
      console.error(e)
    }
  }

  // Push first image now
  await tick()

  // Cycle every 5s
  setInterval(tick, INTERVAL_MS)
}

main().catch(e => {
  status(`Fatal: ${e.message}`, 'err')
  console.error(e)
})
