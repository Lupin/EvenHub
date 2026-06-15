/**
 * bitmap-font.ts — Rendu texte bitmap 2 tons
 * 
 * Deux spritesheets : white (score) et grey (noms d'équipe).
 * Rendu natif à la taille finale, pas de scaling flou.
 */

interface GlyphMeta { x: number; w: number }
interface FontMeta { glyph_w: number; glyph_h: number; glyphs: Record<string, GlyphMeta> }

const CANVAS_W = 288
const CANVAS_H = 144
const GAP = 2

const cache: Record<string, { meta: FontMeta; img: HTMLImageElement }> = {}

async function loadFont(name: string) {
  if (cache[name]) return cache[name]
  const [metaR, img] = await Promise.all([
    fetch(`/images/bitmap-font-${name}.json`).then(r => r.json()),
    new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error(`${name} load failed`))
      el.src = `/images/bitmap-font-${name}.png`
    }),
  ])
  cache[name] = { meta: metaR as FontMeta, img }
  return cache[name]
}

/** Mesure la largeur d'une chaîne. */
function measure(meta: FontMeta, text: string): number {
  let w = 0
  for (const ch of text.toUpperCase()) {
    const g = meta.glyphs[ch]
    if (g) w += g.w + GAP
  }
  return w > 0 ? w - GAP : 0
}

/**
 * Rendu d'un bloc de texte avec une couleur donnée.
 * Retourne le canvas pour le compositing final.
 */
async function renderLayer(text: string, name: 'white' | 'grey'): Promise<HTMLCanvasElement> {
  const { meta, img } = await loadFont(name)
  const upper = text.toUpperCase()
  const tw = measure(meta, upper)

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')!

  let x = Math.floor((CANVAS_W - tw) / 2)
  const y = Math.floor((CANVAS_H - meta.glyph_h) / 2)

  for (const ch of upper) {
    const g = meta.glyphs[ch]
    if (!g) { x += meta.glyph_w + GAP; continue }
    ctx.drawImage(img, g.x, 0, g.w, meta.glyph_h, x, y, g.w, meta.glyph_h)
    x += g.w + GAP
  }

  return canvas
}

/**
 * Rendu complet : chaque segment [texte, couleur] est rendu séparément
 * puis composité sur un canvas final → blob PNG.
 */
export async function renderSegments(
  segments: Array<{ text: string; color: 'white' | 'grey' }>
): Promise<Blob> {
  // Rendre chaque couche
  const layers = await Promise.all(segments.map(s => renderLayer(s.text, s.color)))

  // Composer
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  for (const layer of layers) {
    ctx.drawImage(layer, 0, 0)
  }

  return new Promise((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
  )
}
