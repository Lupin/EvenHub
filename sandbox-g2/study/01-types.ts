/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  BAD PARROT — ÉTUDE DE CODE  (à lire en 1er)               ║
 * ║  Fichier 1/6 : types.ts — Les définitions de types          ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * CE FICHIER SERT À QUOI ?
 * ─────────────────────────
 * C'est le "dictionnaire" du projet. On y définit la forme des
 * données qu'on va manipuler. Ça permet à TypeScript de vérifier
 * qu'on ne fait pas n'importe quoi (ex: mettre du texte là où
 * on attend un nombre).
 *
 * POURQUOI C'EST SÉPARÉ DES AUTRES FICHIERS ?
 * ────────────────────────────────────────────
 * Pour que tous les autres fichiers puissent importer ces types
 * sans se copier le code. Si on change une définition, tout le
 * projet est mis à jour automatiquement.
 */

// ═══════════════════════════════════════════════════════════════
// 1. IMPORT — On va chercher un type défini ailleurs
// ═══════════════════════════════════════════════════════════════

// "import type" = on importe SEULEMENT le type, pas la valeur.
// C'est plus léger, et ça disparaît à la compilation.
// "Phrase" vient de data.ts (fichier 2/6).
import type { Phrase } from './data'

// ═══════════════════════════════════════════════════════════════
// 2. TYPE — Un alias pour une union de valeurs
// ═══════════════════════════════════════════════════════════════

// "export" = rend ce type utilisable depuis les autres fichiers.
// "type NavigationLevel = 0 | 1 | 2 | 3" veut dire :
//   → Une variable de ce type ne peut valoir QUE 0, 1, 2 ou 3.
//   → Si on essaie de mettre 5, TypeScript hurle.
// C'est plus clair que de mettre "number" partout.
export type NavigationLevel = 0 | 1 | 2 | 3

// Les niveaux dans Bad Parrot :
//   0 = liste des catégories (Street, Casual, Gen Z...)
//   1 = liste des phrases dans une catégorie
//   2 = détail d'une phrase (kanji + prononciation + trad)
//   3 = mode "tous les kanjis" (pas utilisé dans la v0.2.3)

// ═══════════════════════════════════════════════════════════════
// 3. INTERFACE — La forme d'un objet
// ═══════════════════════════════════════════════════════════════

// Une "interface" décrit les propriétés qu'un objet doit avoir.
// Ici, AppState a trois propriétés :
//   - level : le niveau actuel (0, 1, 2 ou 3)
//   - currentCategory : l'index de la catégorie sélectionnée
//   - currentPhrase : l'index de la phrase sélectionnée
//
// Différence type vs interface (pour faire simple) :
//   - type   = alias, union, intersection
//   - interface = forme d'un objet (on peut l'étendre plus tard)
// Dans la pratique, les deux sont souvent interchangeables.
export interface AppState {
  level: NavigationLevel        // le type réutilise NavigationLevel défini plus haut
  currentCategory: number       // index dans le tableau categories[]
  currentPhrase: number         // index dans categories[x].phrases[]
}

// ═══════════════════════════════════════════════════════════════
// 4. CONSTANTES — Des valeurs qui ne changent jamais
// ═══════════════════════════════════════════════════════════════

// ANCHOR_Y = la position Y (verticale) de départ pour tout le
// contenu sur les lunettes. 20 pixels depuis le haut.
// IMPORTANT : on garde TOUJOURS le même Y pour éviter que le
// texte "saute" visuellement quand on change de page.
export const ANCHOR_Y = 20

// L'écran des G2 fait 576 pixels de large. La police n'est PAS
// à largeur fixe (pas monospace). Les caractères ASCII (a,b,1,?)
// prennent ~1 colonne, les caractères larges (漢字, █) 2 colonnes.
// → On peut mettre ~45 caractères ASCII par ligne, ou ~22 fullwidth.
export const MAX_ASCII_CHARS = 45
export const MAX_FULLWIDTH_CHARS = 22

// ═══════════════════════════════════════════════════════════════
// 5. FONCTION UTILITAIRE — condense()
// ═══════════════════════════════════════════════════════════════

/**
 * Tronque un texte s'il dépasse une longueur max, en ajoutant "…"
 *
 * @param text     Le texte à potentiellement tronquer
 * @param maxChars Nombre max de caractères autorisés
 * @returns        Le texte (tronqué ou non)
 *
 * Exemple : condense("Bonjour le monde", 10) → "Bonjour l…"
 *           condense("Court", 10)            → "Court"
 */
export function condense(text: string, maxChars: number): string {
  // Si le texte est plus court que la limite, on le retourne tel quel
  if (text.length <= maxChars) return text

  // Sinon on coupe à maxChars - 1 et on ajoute "…" (1 caractère)
  // substring(0, n) = prend les caractères de la position 0 à n-1
  return text.substring(0, maxChars - 1) + '…'
}

// ═══════════════════════════════════════════════════════════════
// RÉSUMÉ DE CE FICHIER
// ═══════════════════════════════════════════════════════════════
//
// types.ts définit :
//   1. NavigationLevel : les 4 niveaux possibles (0|1|2|3)
//   2. AppState : la forme de l'état de l'app
//   3. ANCHOR_Y, MAX_ASCII_CHARS, MAX_FULLWIDTH_CHARS : constantes
//   4. condense() : un raccourcisseur de texte
//
// Ces définitions sont importées par main.ts, input.ts, et display/index.ts
