/**
 * block-digits.ts — Chiffres géants en block elements Unicode
 * 
 * Chaque chiffre est une grille 5×3 de caractères fullwidth :
 *   █ = U+2588 (full block) → pixel allumé
 *   ▒ = U+2592 (medium shade) → gris 50%
 *   　 = U+3000 (ideographic space) → pixel éteint
 * 
 * Les caractères fullwidth font 2× la largeur d'un ASCII,
 * ce qui donne des glyphes monospaces nets.
 * 
 * Avantage : texte LVGL natif, pas d'image, mise à jour instantanée
 * via textContainerUpgrade. Dynamique par nature.
 */

const FW = '\u3000'  // espace fullwidth
const ON = '\u2588'  // █ full block
const GR = '\u2592'  // ▒ medium shade (gris ~50%)

// Grille 5×3 (hauteur×largeur en blocs)
// 5 lignes × 27px line-height = 135px → ~47% de l'écran
// 3 blocs × 2 colonnes = 6 colonnes ASCII par chiffre

const DIGITS: Record<string, string[]> = {
  '0': [ON+ON+ON, ON+FW+ON, ON+FW+ON, ON+FW+ON, ON+ON+ON],
  '1': [FW+ON+FW, ON+ON+FW, FW+ON+FW, FW+ON+FW, ON+ON+ON],
  '2': [ON+ON+ON, FW+FW+ON, ON+ON+ON, ON+FW+FW, ON+ON+ON],
  '3': [ON+ON+ON, FW+FW+ON, ON+ON+ON, FW+FW+ON, ON+ON+ON],
  '4': [ON+FW+ON, ON+FW+ON, ON+ON+ON, FW+FW+ON, FW+FW+ON],
  '5': [ON+ON+ON, ON+FW+FW, ON+ON+ON, FW+FW+ON, ON+ON+ON],
  '6': [ON+ON+ON, ON+FW+FW, ON+ON+ON, ON+FW+ON, ON+ON+ON],
  '7': [ON+ON+ON, FW+FW+ON, FW+FW+ON, FW+FW+ON, FW+FW+ON],
  '8': [ON+ON+ON, ON+FW+ON, ON+ON+ON, ON+FW+ON, ON+ON+ON],
  '9': [ON+ON+ON, ON+FW+ON, ON+ON+ON, FW+FW+ON, ON+ON+ON],
  ':': [FW+FW+FW, FW+ON+FW, FW+FW+FW, FW+ON+FW, FW+FW+FW],
}

/** Calcule le nombre de colonnes ASCII d'un texte en digits. */
function measureDigits(text: string): number {
  let w = 0
  for (const ch of text) {
    if (ch === ' ') w += 2  // espace
    else if (DIGITS[ch]) w += 6 + 2  // 3 blocs × 2 cols + gap
    else if (ch === ':') w += 6 + 2  // même taille que chiffre
  }
  return w
}

/** Génère le contenu textContainer pour un score. */
export function renderScore(text: string): string {
  const lines: string[] = ['', '', '', '', '']
  const chars = [...text]

  for (const ch of chars) {
    if (ch === ' ') {
      for (let r = 0; r < 5; r++) lines[r] += FW + FW
      continue
    }
    const glyph = DIGITS[ch.toUpperCase()]
    if (!glyph) {
      for (let r = 0; r < 5; r++) lines[r] += FW + FW
      continue
    }
    for (let r = 0; r < 5; r++) lines[r] += glyph[r] + FW
  }

  return lines.join('\n')
}
